import { Card, CardContent, Box, useTheme, type Theme } from "@mui/material";
import { type ReactNode, useLayoutEffect, useRef, useState, type Ref } from "react";
import { shortYear, type YearMonthDay } from "./date";
import type {} from "@mui/material/themeCssVarsAugmentation";
import { ChipRail } from "./ChipRail";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { LazyTooltip } from "./LazyTooltip";
import { scrollbarSx } from "./scrollbarSx";
import { useOpenAtLatest } from "./useOpenAtLatest";
import {
  buildTicks,
  decidePlacement,
  latestEnd,
  packRows,
  percentAtScroll,
  percentOfSpan,
  scrollAtPercent,
  scrollBehaviourFor,
  yearAtPercent,
  yearMarkers,
  type Placement,
  type PositionedTimelineData,
  type TimelineData,
  type TimelineTick,
  type YearMarker,
} from "./timelineLayout";

export type { TimelineData };

// ============================================================================
// Constants
// ============================================================================
const AXIS_HEIGHT = 45;
/**
 * Row pitch and padding are held to the height the chart has always been: the Shows timeline
 * runs to 22 rows, and anything taller pushes it past the viewport and starts scrolling a chart
 * that used to be readable in one glance. The padding is halved against the older figure because
 * the height it feeds now accounts for the last row properly, giving real clearance at both ends
 * rather than double at the top and none at the bottom.
 */
const ROW_HEIGHT = 25;
const ROW_PADDING = 5;
const BAR_HEIGHT = ROW_HEIGHT - ROW_PADDING;
const BAR_RADIUS = 6;
/**
 * A sliver is a real event, not a rounding error: at 400vw over a decade a single day is barely
 * a pixel, so without a floor the shortest entries disappear entirely.
 */
const MIN_BAR_WIDTH = 4;
const SVG_PADDING = 10;
const LABEL_FONT_SIZE = 13;
/**
 * Both sit below the bar labels, because the scale is chrome and the bars are the content — the
 * axis reading larger than the data it measures is what made it shout.
 */
const MONTH_FONT_SIZE = 12;
const YEAR_FONT_SIZE = 15;

const pct = (percent: number) => `${percent}%`;

/**
 * The chart is four viewports wide, and a bar runs to the container's edge at every scroll
 * position, so nothing in the picture says it continues. The scrollbar is the one thing that can
 * say so at no cost per frame: styling it at all opts macOS out of overlay scrollbars, which hide
 * themselves the moment scrolling stops, and a thumb a quarter of the track long states both that
 * there is more and how much.
 *
 * `scrollbarWidth`/`scrollbarColor` are what Firefox reads and `::-webkit-scrollbar` the rest, so
 * both are given, from the same two tokens. The thumb takes the secondary text tone rather than
 * the divider: it is a control to be aimed at, and at 10px a divider-weight bar disappears into
 * the card it sits on.
 */
const scrollSx = (theme: Theme) => ({
  width: "100%",
  maxHeight: "90vh",
  overflowX: "auto",
  overflowY: "auto",
  ...scrollbarSx(theme),
});

/**
 * Grow from the bar's own centre rather than its top edge. `fill-box` makes the rect's bounding
 * box the transform origin; animating `y`/`height` instead is patchily supported.
 *
 * Hoisted so all 800-odd bars share one class and one object identity.
 */
const BAR_SX = {
  transformBox: "fill-box",
  transformOrigin: "center",
} as const;

/**
 * The bar answers to its label as well as to itself, so the two never disagree about whether the
 * pointer is on this item — a centred label covers its own bar, and an outside one does not.
 *
 * Safe to hang off the group only because the label's `foreignObject` is `pointer-events: none`;
 * it spans the entire gap to the neighbouring items, and would otherwise light this bar up from
 * hundreds of pixels away.
 *
 * The step is deliberately instant. A CSS transition here is created but its clock never
 * advances — the tooltip opening re-renders the row, which restarts the transition every frame,
 * so the bar stays pinned at its start value and never appears to move at all. Measured on both
 * `transform` and `filter`; adding one back reintroduces a hover that silently does nothing.
 */
const ROW_SX = {
  "&:hover rect": { transform: "scaleY(1.15)" },
} as const;

// ============================================================================
// Types
// ============================================================================
type LayoutInfo = {
  placement: Placement;
  textPx: number;
  barPx: number;
  availableLeftPx: number;
  availableRightPx: number;
};

const defaultLayout: LayoutInfo = {
  placement: "center",
  textPx: 0,
  barPx: 0,
  availableLeftPx: 0,
  availableRightPx: 0,
};

type ItemRefs = {
  rect: SVGRectElement | null;
  fo: SVGForeignObjectElement | null;
  text: HTMLDivElement | null;
};

// ============================================================================
// Hooks
// ============================================================================
/**
 * Hook to dynamically calculate where text should be placed (center, left, right)
 * relative to its colored bar, ensuring it is fully visible and doesn't overlap other text.
 * It uses a `useLayoutEffect` to read actual DOM node dimensions after rendering.
 */
const useTextPlacement = (data: PositionedTimelineData[]) => {
  const [layouts, setLayouts] = useState<Map<PositionedTimelineData, LayoutInfo>>(new Map());
  // Holds references to the DOM elements (bar rect, foreignObject container, and text element)
  const itemRefs = useRef(new Map<PositionedTimelineData, ItemRefs>());

  const setItemRef =
    <T extends keyof ItemRefs>(event: PositionedTimelineData, type: T) =>
    (el: ItemRefs[T] | null) => {
      const item = itemRefs.current.get(event) ?? { rect: null, fo: null, text: null };
      item[type] = el;
      // Keys are the row objects themselves, which are rebuilt whenever the data changes.
      // Without this, every detached row would linger — holding its tooltip element tree,
      // and through it the domain record — and the effect below would walk the dead ones too.
      if (!item.rect && !item.fo && !item.text) itemRefs.current.delete(event);
      else itemRefs.current.set(event, item);
    };

  useLayoutEffect(() => {
    const map = new Map<PositionedTimelineData, LayoutInfo>();
    // Tracks if space to the right of an event has been taken by a previous event in the same row
    const rightUsed: boolean[] = [];

    itemRefs.current.forEach(({ text, fo, rect }, event) => {
      if (!text || !fo || !rect) return;

      const foBox = fo.getBoundingClientRect(); // The foreignObject boundary (total available space)
      const rectBox = rect.getBoundingClientRect(); // The colored bar itself

      const textWidth = text.scrollWidth;
      const rectWidth = rectBox.width;

      // Calculate available space to the right and left of the colored bar
      const rightWidth = foBox.right - rectBox.right;
      const leftWidth = rectBox.left - foBox.left;

      const decision = decidePlacement({
        textWidth,
        rectWidth,
        leftWidth,
        rightWidth,
        rightUsed: rightUsed[event.rowNumber] ?? false,
      });
      rightUsed[event.rowNumber] = decision.rightUsed;

      map.set(event, {
        availableLeftPx: leftWidth,
        availableRightPx: rightWidth,
        barPx: rectWidth,
        textPx: textWidth,
        placement: decision.placement,
      });
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayouts(map);
  }, [data]);

  return { layouts, setItemRef };
};

// ============================================================================
// Components
// ============================================================================
const TimeLineChart = ({ timelineData }: { timelineData: TimelineData[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledYear, setScrolledYear] = useState<number | undefined>(undefined);
  useOpenAtLatest(scrollRef, timelineData.length > 0);
  const [positionedTimelineData, maxRow] = packRows(timelineData);

  if (positionedTimelineData.length === 0) {
    return null;
  }

  const earliestStart = positionedTimelineData[0].start.startOfMonth();
  const gridEnd = latestEnd(positionedTimelineData)!;
  const totalDays = earliestStart.daysTo(gridEnd)!;

  // Walked once and handed to both consumers, so a gridline and the tick label beneath it are the
  // same number rather than two derivations that agree by luck.
  const ticks = buildTicks(earliestStart.toYearMonth(), gridEnd.toYearMonth(), totalDays);

  // `maxRow` is the highest row index, so the last bar ends a full bar below its own offset.
  const totalHeight = (maxRow + 1) * ROW_HEIGHT + SVG_PADDING * 2 - ROW_PADDING;

  const markers = yearMarkers(ticks);

  /**
   * The chip the rail lights up.
   *
   * Never a year the rebuilt chart does not have: a filter interaction leaves the reader's scroll
   * position where it was and can drop the year they were looking at, and a chip naming an absent
   * year points at nothing. The nearest surviving year is what stands in until the next scroll
   * corrects it. With nothing scrolled yet this is the latest year, which is the end the chart
   * opens at.
   */
  const activeYear = markers.findLast((marker) => marker.year <= (scrolledYear ?? Infinity))?.year ?? markers[0]?.year;

  const maxScrollOf = (element: HTMLDivElement) => element.scrollWidth - element.clientWidth;

  const scrollToPercent = (percent: number) => {
    const element = scrollRef.current;
    if (!element) return;

    const left = scrollAtPercent(markers, percent, maxScrollOf(element));
    element.scrollTo({ left, behavior: scrollBehaviourFor(left - element.scrollLeft, element.clientWidth) });
  };

  return (
    <>
      <Box
        ref={scrollRef}
        sx={scrollSx}
        /**
         * The scroll position reaches React as the year it lands in and nothing else, so the
         * hundreds of events a single drag produces settle to one state change per year crossed —
         * setting a state to the value it already holds costs no render. Holding the raw offset
         * instead would re-render the whole chart on every frame of every scroll.
         *
         * A JSX handler rather than a listener in an effect because `markers` is rebuilt each
         * render: an effect would need it as a dependency and reattach just as often, and reading
         * it through a ref to avoid that is machinery for a listener React already manages.
         *
         * The offset is read against the range `scrollLeft` can actually reach rather than against
         * the grid's own width — see `percentAtScroll`, which owns both directions of that mapping.
         */
        onScroll={(event) =>
          setScrolledYear(
            yearAtPercent(
              markers,
              percentAtScroll(markers, event.currentTarget.scrollLeft, maxScrollOf(event.currentTarget)),
            ),
          )
        }
      >
        <div
          style={{ width: "400vw", maxHeight: "90vh", position: "relative", display: "flex", flexDirection: "column" }}
        >
          {/* `minHeight: 0` because a column flex item defaults to `min-height: auto` and would
              refuse to shrink below the grid's height — the scroll would fall through to the
              container above and take the axis off-screen with it. */}
          <div style={{ overflowY: "auto", minHeight: 0 }}>
            <TimelineGrid
              data={positionedTimelineData}
              startDate={earliestStart}
              endDate={gridEnd}
              totalHeight={totalHeight}
              totalDays={totalDays}
              ticks={ticks}
              markers={markers}
            />
          </div>
          <TimeAxis ticks={ticks} />
        </div>
      </Box>
      <YearNav
        markers={markers}
        activeYear={activeYear}
        onSelect={scrollToPercent}
      />
    </>
  );
};

/**
 * A chip per year, which is the only way to cross the chart short of dragging through four
 * viewport widths.
 *
 * The chips are evenly spaced rather than placed at their own percentages: a year is one click,
 * and evenly spaced targets are easier to hit than ones bunched wherever the data is dense. Two
 * digits because the axis above already spells the year out, and a row of full years is wide
 * enough to need scrolling itself on a phone.
 *
 * The active chip is derived from the scroll position rather than set on click, so dragging the
 * chart moves the highlight too and the row reads as a position indicator either way.
 */
const YearNav = ({
  markers,
  activeYear,
  onSelect,
}: {
  markers: YearMarker[];
  activeYear: number | undefined;
  onSelect: (percent: number) => void;
}) => {
  const theme = useTheme();

  return (
    <ChipRail
      items={markers.map((marker) => ({
        id: marker.year.toString(),
        label: shortYear(marker.year),
      }))}
      activeId={activeYear?.toString()}
      onSelect={(id) => onSelect(markers.find((marker) => marker.year.toString() === id)!.percent)}
      // The chart stands in a card, so the ends fade into its paper. The page's own ground is a
      // different colour in both schemes, and fading into it here paints a band of the wrong one.
      ground={theme.vars.palette.background.paper}
      sx={{ paddingTop: 1 }}
      rowSx={{
        // Spread across the same width the chart occupies, so the row reads as a scale under it
        // rather than as a cluster of buttons beside it. Once the chips no longer fit, the free
        // space is negative and `space-between` falls back to packing them from the left, which is
        // what makes scrolling the sane degradation.
        justifyContent: "space-between",
        gap: 0.5,
      }}
    />
  );
};

/**
 * Year shading and gridlines, so a bar can be read against a date without tracing down to the
 * axis — which on a tall chart is several hundred pixels away.
 *
 * Shaded by calendar-year parity rather than by position in the list, so the same years are
 * shaded whatever date a given chart's data happens to begin on. Bands are drawn before lines so
 * a year line sits on top of its own edge, and the whole layer is the first child of the `svg`
 * because SVG paints in document order and has no `z-index`.
 */
const TimelineBackground = ({
  ticks,
  markers,
  height,
}: {
  ticks: TimelineTick[];
  markers: YearMarker[];
  height: number;
}) => {
  const theme = useTheme();

  const bands = markers
    .map((band, index) => ({ ...band, end: markers[index + 1]?.percent ?? 100 }))
    .filter((band) => band.year % 2 === 0);

  return (
    // Full-height rects would otherwise be the topmost hit target across most of the chart.
    <g pointerEvents="none">
      {bands.map((band) => (
        <rect
          key={band.year}
          x={pct(band.percent)}
          y={0}
          width={pct(band.end - band.percent)}
          height={height}
          style={{ fill: theme.vars.palette.divider }}
          fillOpacity={0.35}
        />
      ))}
      {ticks
        .filter((tick) => tick.level !== "month")
        .map((tick) => (
          <line
            key={tick.percent}
            x1={pct(tick.percent)}
            x2={pct(tick.percent)}
            y1={0}
            y2={height}
            style={{ stroke: theme.vars.palette.divider }}
            strokeOpacity={tick.level === "year" ? 1 : 0.45}
            strokeWidth={1}
          />
        ))}
    </g>
  );
};

const TimelineGrid = ({
  data,
  startDate,
  endDate,
  totalHeight,
  totalDays,
  ticks,
  markers,
}: {
  data: PositionedTimelineData[];
  startDate: YearMonthDay;
  endDate: YearMonthDay;
  totalHeight: number;
  totalDays: number;
  ticks: TimelineTick[];
  markers: YearMarker[];
}) => {
  const { layouts, setItemRef } = useTextPlacement(data);

  return (
    <svg
      height={totalHeight}
      width="100%"
    >
      <TimelineBackground
        ticks={ticks}
        markers={markers}
        height={totalHeight}
      />
      {data.map((event) => (
        <TimelineText
          key={event.name}
          event={event}
          startDate={startDate}
          endDate={endDate}
          totalDays={totalDays}
          foRef={setItemRef(event, "fo")}
          textRef={setItemRef(event, "text")}
          rectRef={setItemRef(event, "rect")}
          layoutInfo={layouts.get(event) ?? defaultLayout}
        />
      ))}
    </svg>
  );
};

const TimelineText = ({
  event,
  startDate,
  endDate,
  totalDays,
  foRef,
  textRef,
  rectRef,
  layoutInfo,
}: {
  event: PositionedTimelineData;
  startDate: YearMonthDay;
  endDate: YearMonthDay;
  totalDays: number;
  foRef: Ref<SVGForeignObjectElement>;
  textRef: Ref<HTMLDivElement>;
  rectRef: Ref<SVGRectElement>;
  layoutInfo: LayoutInfo;
}) => {
  // Calculate relative X/Y positioning and width of the visual bar
  const x = pct(percentOfSpan(startDate, event.start, totalDays, 0.75));
  const width = pct(percentOfSpan(event.start, event.end, totalDays, -0.75));
  const y = event.rowNumber * ROW_HEIGHT + SVG_PADDING + "px";

  // The `<foreignObject>` acts as a container for the text that spans the *entire available empty space*
  // between the previous event and the next event on this row.
  const spaceLeftStart = event.previousDate ?? startDate;
  const availableLeft = percentOfSpan(spaceLeftStart, event.start, totalDays);

  const textContainerEnd = event.nextDate ?? endDate;
  const totalTextContainerWidth = pct(percentOfSpan(spaceLeftStart, textContainerEnd, totalDays));

  // Shift the foreign object to start exactly where the previous event ended
  const foreignObjectX = pct(-availableLeft);

  const leftPadding = layoutInfo.placement === "right" ? `${layoutInfo.barPx + 5}px` : "5px";
  const rightPadding = layoutInfo.placement === "left" ? `${layoutInfo.barPx + 5}px` : "5px";
  const leftPosition = `${layoutInfo.placement === "left" ? layoutInfo.availableLeftPx - layoutInfo.textPx : layoutInfo.availableLeftPx}px`;
  // A span starts on the bar like a centred label but is free to run off its end, so its width is
  // the two added together rather than either alone.
  const labelWidth =
    layoutInfo.placement === "center"
      ? `${layoutInfo.barPx}px`
      : layoutInfo.placement === "span"
        ? `${layoutInfo.barPx + layoutInfo.availableRightPx}px`
        : "fit-content";

  return (
    <Box
      component="g"
      x={x}
      y={y}
      style={{ transform: `translate(${x}, ${y})` }}
      sx={ROW_SX}
    >
      <Box
        component="rect"
        width={width}
        height={BAR_HEIGHT}
        fill={event.colour}
        rx={BAR_RADIUS}
        style={{ width: `max(${width}, ${MIN_BAR_WIDTH}px)` }}
        sx={BAR_SX}
        ref={rectRef}
      />
      {/* The label spans the whole gap around its bar, so left to itself it would swallow the
          pointer across most of the chart — including over the bar it sits on. The label re-enables
          events for itself, which is what the tooltip hangs off. */}
      <foreignObject
        x={foreignObjectX}
        y="0"
        width={totalTextContainerWidth}
        height={BAR_HEIGHT}
        overflow="hidden"
        pointerEvents="none"
        ref={foRef}
      >
        <HoverCardTooltip
          colour={event.colour}
          title={<LazyTooltip render={event.tooltip} />}
        >
          <Box
            sx={{
              position: "fixed",
              pointerEvents: "auto",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontSize: LABEL_FONT_SIZE,
              fontWeight: 500,
              // The label sets `left` but never `top`, so it lands at the top of its row and is
              // centred only by its own line box. Matching that box to the bar is what keeps the
              // text on the bar's centre line at any bar height.
              lineHeight: `${BAR_HEIGHT}px`,
              paddingLeft: leftPadding,
              paddingRight: rightPadding,
              left: leftPosition,
              width: labelWidth,
              /**
               * A span is the one label crossing from its bar onto the card, so no single colour
               * has contrast for the whole run — and a halo only softens the mismatch rather than
               * removing it, which shows up worst in the light scheme where the text is dark and
               * the bar beneath it is not.
               *
               * Painting the glyphs with a gradient clipped to the text switches colour at the
               * bar's edge to the pixel, so each half gets the contrast it would have had on its
               * own. The stops are hard, and measured from the element's left edge, which is the
               * bar's left edge.
               */
              color: (theme) =>
                layoutInfo.placement === "span"
                  ? "transparent"
                  : layoutInfo.placement === "center"
                    ? theme.palette.getContrastText(event.colour)
                    : theme.vars.palette.text.primary,
              backgroundImage: (theme) =>
                layoutInfo.placement === "span"
                  ? `linear-gradient(to right, ${theme.palette.getContrastText(event.colour)} 0 ${layoutInfo.barPx}px, ${theme.vars.palette.text.primary} ${layoutInfo.barPx}px)`
                  : undefined,
              WebkitBackgroundClip: layoutInfo.placement === "span" ? "text" : undefined,
              backgroundClip: layoutInfo.placement === "span" ? "text" : undefined,
            }}
            ref={textRef}
          >
            {event.name}
          </Box>
        </HoverCardTooltip>
      </foreignObject>
    </Box>
  );
};

/**
 * The month/quarter/year scale beneath the grid.
 *
 * A tick's significance is carried by its length, its weight and its strength together, all from
 * the same token the labels use — so the axis reads as one piece of chrome and follows the colour
 * scheme rather than a fixed grey.
 */
const TimeAxis = ({ ticks }: { ticks: TimelineTick[] }) => {
  const theme = useTheme();

  return (
    <svg
      height={AXIS_HEIGHT}
      width={"100%"}
    >
      {/* Closes the scale off from the grid above it. Without a rule the ticks hang in space, and
          the only thing marking where the chart ends is where the bars happen to stop. */}
      <line
        x1={0}
        x2="100%"
        y1={0}
        y2={0}
        style={{ stroke: theme.vars.palette.divider }}
      />
      {ticks.map((tick) => (
        <g
          key={tick.percent}
          style={{ transform: `translateX(${pct(tick.percent)})` }}
        >
          {/* A year runs the full height so it continues the gridline behind the bars into the
              label naming it; the shorter marks stay inset, which is the hierarchy. */}
          <line
            y1={tick.level === "year" ? 0 : tick.level === "quarter" ? 25 : 30}
            y2={AXIS_HEIGHT - 2}
            style={{ stroke: theme.vars.palette.text.secondary }}
            strokeOpacity={tick.level === "year" ? 1 : tick.level === "quarter" ? 0.6 : 0.3}
            strokeWidth={tick.level === "year" ? 1.5 : 1}
          />
          {/* January is named by its year, so labelling the month as well says the same thing
              twice and costs a quarter of the labels on a crowded scale. */}
          {tick.level === "quarter" && (
            <text
              x="5"
              y="20"
              style={{ fill: theme.vars.palette.text.secondary, fontSize: MONTH_FONT_SIZE }}
            >
              {tick.monthLabel}
            </text>
          )}
          {/* A tier of its own, so years read as the stratum you navigate by and the months as
              subdivisions of one. Dropping January's month label leaves this line to itself. */}
          {tick.level === "year" && (
            <text
              x="5"
              y="40"
              style={{ fill: theme.vars.palette.text.primary, fontSize: YEAR_FONT_SIZE, fontWeight: "bold" }}
            >
              {tick.yearLabel}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

const Timeline = ({ data, children }: { data: TimelineData[]; children?: ReactNode }) => {
  return (
    <Card>
      {children}
      <CardContent>
        <TimeLineChart timelineData={data} />
      </CardContent>
    </Card>
  );
};

export default Timeline;
