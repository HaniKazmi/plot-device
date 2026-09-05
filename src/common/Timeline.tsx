import { Card, CardContent, Box, useTheme, type Theme } from "@mui/material";
import { type ReactNode, useState } from "react";
import { shortYear, type YearMonthDay } from "./date";
import type {} from "@mui/material/themeCssVarsAugmentation";
import { ChipRail } from "./ChipRail";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { useCoarsePointer } from "./useCoarsePointer";
import { LazyTooltip } from "./LazyTooltip";
import { ScrollFade } from "./ScrollFade";
import { CONTAIN_SIDEWAYS_SCROLL, scrollbarSx } from "./scrollbarSx";
import { useOpenAtLatest } from "./useOpenAtLatest";
import { useScrollEdges } from "./useScrollEdges";
import { useElementWidth } from "./useElementWidth";
import {
  buildTicks,
  decidePlacement,
  latestEnd,
  packRows,
  percentAtDate,
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
 * Row pitch and padding are what keep the chart inside one screen: the Shows timeline runs to 22
 * rows, and a taller pitch pushes it past the viewport, so a chart that reads in one glance starts
 * scrolling instead. The padding is half the pitch's own margin because the height it feeds counts
 * the last row, which is what gives real clearance at both ends rather than double at the top and
 * none at the bottom.
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
/**
 * The weight a label is set in, shared with the canvas that measures one.
 *
 * A width measured at another weight is a placement decided against a label nobody draws, and it
 * is cached under the font string, so the wrong answer is kept for the session.
 */
const LABEL_WEIGHT = 500;
const SVG_PADDING = 10;
const LABEL_FONT_SIZE = 13;
/** The room a label keeps either side of its own text, and so what its box measures over its glyphs. */
const LABEL_PADDING = 5;
/**
 * How many viewports of scroll the grid runs to, as CSS and as the number label placement is
 * solved against. One constant for both: the placement arithmetic works in percentages of the
 * grid and has to turn them into pixels, and a width stated twice is a width that can disagree
 * with itself — silently, since a label placed against the wrong grid still renders.
 */
const GRID_VIEWPORTS = 4;
const GRID_WIDTH = `${GRID_VIEWPORTS * 100}vw`;
/**
 * Both sit below the bar labels, because the scale is chrome and the bars are the content — the
 * axis reading larger than the data it measures is what made it shout.
 */
const MONTH_FONT_SIZE = 12;
const YEAR_FONT_SIZE = 15;

const pct = (percent: number) => `${percent}%`;

/**
 * How much of the viewport the grid may take before it scrolls inside itself.
 *
 * On a desktop a chart taller than the viewport is a chart whose top the reader cannot see while
 * reading its foot, so it caps and scrolls vertically within the card. A phone has no height to
 * spare for that: the cap makes a second scroller inside a page that already scrolls, one that
 * takes the drag meant for the page and hides most of the rows behind it. Uncapped, the grid
 * stands at exactly the height its packed rows need — `packRows` decides that, and the page
 * scrolls past it.
 */
const CHART_MAX_HEIGHT = { xs: "none", md: "90vh" } as const;

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
  maxHeight: CHART_MAX_HEIGHT,
  overflow: "auto",
  ...CONTAIN_SIDEWAYS_SCROLL,
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
  "@media (pointer: coarse)": { cursor: "pointer" },
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
  // Behind `hover: hover` because a tap on a touch screen leaves the last bar touched stuck at
  // its hovered size until the next tap lands somewhere else, which reads as a selection the
  // chart never made.
  "@media (hover: hover)": { "&:hover rect": { transform: "scaleY(1.15)" } },
} as const;

/**
 * Everything about a label that is the same for every label.
 *
 * What varies with the item — its padding, its offset, its width, its colour and the gradient a
 * span is painted with — is set as inline `style` instead: each distinct set of values reaching
 * `sx` mints an emotion class of its own, and a chart draws hundreds of labels, no two of them
 * at the same offset or width.
 */
const LABEL_SX = {
  position: "fixed",
  pointerEvents: "auto",
  textOverflow: "ellipsis",
  overflow: "hidden",
  whiteSpace: "nowrap",
  fontSize: LABEL_FONT_SIZE,
  fontWeight: LABEL_WEIGHT,
  // A press on a label is how a card is opened on a phone, and the press that opens it would
  // otherwise put the label's own text into a selection with the handles that come with it.
  userSelect: "none",
  // The label sets `left` but never `top`, so it lands at the top of its row and is centred only
  // by its own line box. Matching that box to the bar is what keeps the text on the bar's centre
  // line at any bar height.
  lineHeight: `${BAR_HEIGHT}px`,
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

/**
 * A bar, where it sits, and how its label is placed on it.
 *
 * The percentages are the grid's own coordinate space, which is what the renderer draws in; the
 * pixel figures beside them are what the placement was decided from and what the label's style is
 * written in. Both are solved in one pass so the two cannot describe different geometry — a label
 * padded for a bar of one width, sitting on a bar of another, is a label off its own mark.
 */
type PlacedTimelineData = PositionedTimelineData & {
  xPercent: number;
  widthPercent: number;
  /** The label's box, spanning to whatever the row holds either side of this bar. */
  labelXPercent: number;
  labelWidthPercent: number;
  layout: LayoutInfo;
};

// ============================================================================
// Hooks
// ============================================================================
/**
 * How wide a label's own box reports itself, without laying one out.
 *
 * The label is `white-space: nowrap` inside an `overflow: hidden` box, so the width it reports is
 * its glyphs plus the padding either side, rounded to the whole pixel — which a canvas answers
 * exactly, given the same font. The two agree: over 1,878 placement decisions, across both charts
 * at two widths, none comes out differently.
 *
 * Asking the DOM instead costs two renders of the whole chart. The measurement can only be taken
 * after a commit, so every label is drawn once at a default placement and again at the measured
 * one — 1,798 style writes across 792 labels on the Shows timeline. It also has to be taken while
 * every label still wears that default, since a placed label reports the width its own answer
 * pinned it to rather than its text, which makes the two-pass shape load-bearing rather than
 * incidental. And the read is `scrollWidth` on HTML inside a `foreignObject`, WebKit's weakest
 * layout path, three hundred to eight hundred times over.
 *
 * Cached across charts and re-renders: a name is a fixed string, and the same library is drawn
 * again on every filter change.
 */
const labelWidths = new Map<string, number>();
let measureContext: CanvasRenderingContext2D | null | undefined;

const measureLabel = (text: string, font: string) => {
  const key = `${font}\u0000${text}`;
  const held = labelWidths.get(key);
  if (held !== undefined) return held;

  // Built on first use rather than at module scope, where `document` is absent under the test
  // environment and importing this file would throw.
  measureContext =
    measureContext === undefined ? (document.createElement("canvas").getContext("2d") ?? null) : measureContext;
  // Set per measurement rather than once: the context is shared, and the font is half the cache
  // key, so a caller measuring in another face has to be able to say so.
  if (measureContext) measureContext.font = font;

  // Half the font size a character is a coarse average for a proportional face, and coarse is the
  // point: `decidePlacement` opens on `textWidth <= rectWidth`, so answering zero for a canvas that
  // would not build reads as "fits inside any bar" and pins every label inside a sliver under
  // `overflow: hidden` — a chart with no readable text and nothing said about why.
  const width = measureContext
    ? Math.round(measureContext.measureText(text).width + 2 * LABEL_PADDING)
    : Math.round(text.length * (LABEL_FONT_SIZE / 2) + 2 * LABEL_PADDING);
  labelWidths.set(key, width);
  return width;
};

/**
 * Where every bar sits and where its label goes, in one pass over the rows.
 *
 * Pure arithmetic over the dates, so it runs in the render body and the chart is drawn once,
 * already placed. `rightUsed` carries along a row: a label that has taken the gap to its right
 * has taken it from whatever comes next, which is why this walks the rows in order rather than
 * deciding each bar on its own.
 */
const placeLabels = (
  data: PositionedTimelineData[],
  startDate: YearMonthDay,
  endDate: YearMonthDay,
  totalDays: number,
  gridPx: number,
  font: string,
): PlacedTimelineData[] => {
  const rightUsed: boolean[] = [];

  return data.map((event) => {
    // The offset is `percentAtDate` and the width `percentOfSpan`, so a bar opens on the same
    // gridline the axis draws for its start date; the three quarters of a day is what leaves a
    // visible gap between a bar and the one handed over to it, which the width gives back.
    const xPercent = percentAtDate(startDate, event.start, totalDays, 0.75);
    const widthPercent = percentOfSpan(event.start, event.end, totalDays, -0.75);

    // The label's box spans the entire empty space between the previous event and the next one on
    // this row, and is shifted back to start exactly where the previous event ended.
    const spaceLeftStart = event.previousDate ?? startDate;
    const availableLeftPercent = percentOfSpan(spaceLeftStart, event.start, totalDays);
    const labelWidthPercent = percentOfSpan(spaceLeftStart, event.nextDate ?? endDate, totalDays);

    // The bar as drawn, floor included: a sliver bar is painted at `MIN_BAR_WIDTH`, and a label
    // centred on the width it was asked for would sit off the width it got.
    const barPx = Math.max((widthPercent / 100) * gridPx, MIN_BAR_WIDTH);
    const availableLeftPx = (availableLeftPercent / 100) * gridPx;
    const availableRightPx = (labelWidthPercent / 100) * gridPx - availableLeftPx - barPx;
    const textPx = measureLabel(event.name, font);

    const decision = decidePlacement({
      textWidth: textPx,
      rectWidth: barPx,
      leftWidth: availableLeftPx,
      rightWidth: availableRightPx,
      rightUsed: rightUsed[event.rowNumber] ?? false,
    });
    rightUsed[event.rowNumber] = decision.rightUsed;

    return {
      ...event,
      xPercent,
      widthPercent,
      labelXPercent: -availableLeftPercent,
      labelWidthPercent,
      layout: {
        placement: decision.placement,
        textPx,
        barPx,
        availableLeftPx,
        availableRightPx,
      },
    };
  });
};

// ============================================================================
// Components
// ============================================================================
/**
 * The chart without its card, for a section that already stands in one and switches between this
 * and another reading of the same rows.
 */
export const TimeLineChart = ({ timelineData }: { timelineData: TimelineData[] }) => {
  // The scroller's own ref does both jobs: the chart drives it from the year chips, and the fades
  // read the same node to know which ends have chart past them.
  const [scrollRef, edges] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();
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
      {/* The styled scrollbar is what says the chart runs on, and iOS draws no scrollbar at all;
          the fades say it in a way every platform paints. */}
      <ScrollFade
        edges={edges}
        ground={theme.vars.palette.background.paper}
      >
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
          <Box
            sx={{
              width: GRID_WIDTH,
              maxHeight: CHART_MAX_HEIGHT,
              display: "flex",
              flexDirection: "column",
            }}
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
          </Box>
        </Box>
      </ScrollFade>
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
  const theme = useTheme();
  // Asked once for the whole chart. Every bar mounts two hover cards, so a chart of a few hundred
  // items would otherwise hold a thousand media-query subscriptions to answer one question that
  // cannot differ between them.
  const coarse = useCoarsePointer();
  /**
   * The width the grid is actually drawn at, which is what its own percentages resolve against.
   *
   * The viewport is the right guess and the wrong answer: `GRID_WIDTH` is a `vw` length, so the
   * two agree until the grid's scroller takes a classic scrollbar, or a fractional device pixel
   * ratio lands the box off a whole number. Falling back to it rather than to nothing is what
   * lets the chart draw placed on its first pass — `useElementWidth` reads before paint, so the
   * guess is never a frame the reader sees — and `||` rather than `??` because a zero box is a
   * grid that is not laid out yet, not a grid nought pixels wide.
   */
  const [gridRef, measuredGrid] = useElementWidth<SVGSVGElement>();
  const gridPx = measuredGrid || window.innerWidth * GRID_VIEWPORTS;
  // The font the labels are actually set in, which is what makes the canvas answer the width the
  // DOM would: the family off the theme, the size and weight `LABEL_SX` states.
  const labelFont = `${LABEL_WEIGHT} ${LABEL_FONT_SIZE}px ${theme.typography.fontFamily}`;
  const placed = placeLabels(data, startDate, endDate, totalDays, gridPx, labelFont);

  return (
    <svg
      ref={gridRef}
      height={totalHeight}
      width="100%"
    >
      <TimelineBackground
        ticks={ticks}
        markers={markers}
        height={totalHeight}
      />
      {placed.map((event) => (
        <TimelineText
          key={event.key}
          event={event}
          coarse={coarse}
        />
      ))}
    </svg>
  );
};

const TimelineText = ({
  event,
  coarse,
}: {
  event: PlacedTimelineData;
  /** Read once for the chart, since a bar's two triggers cannot disagree about it. */
  coarse: boolean;
}) => {
  const theme = useTheme();
  const layoutInfo = event.layout;

  // The coordinate space is solved once for the chart, in `placeLabels`, and read here: the bar's
  // own offset and width, and the label's box spanning to the row's neighbours either side.
  const x = pct(event.xPercent);
  const width = pct(event.widthPercent);
  const y = event.rowNumber * ROW_HEIGHT + SVG_PADDING + "px";
  const foreignObjectX = pct(event.labelXPercent);
  const totalTextContainerWidth = pct(event.labelWidthPercent);

  const leftPadding = layoutInfo.placement === "right" ? `${layoutInfo.barPx + LABEL_PADDING}px` : `${LABEL_PADDING}px`;
  const rightPadding = layoutInfo.placement === "left" ? `${layoutInfo.barPx + LABEL_PADDING}px` : `${LABEL_PADDING}px`;
  const leftPosition = `${layoutInfo.placement === "left" ? layoutInfo.availableLeftPx - layoutInfo.textPx : layoutInfo.availableLeftPx}px`;
  // A span starts on the bar like a centred label but is free to run off its end, so its width is
  // the two added together rather than either alone.
  const labelWidth =
    layoutInfo.placement === "center"
      ? `${layoutInfo.barPx}px`
      : layoutInfo.placement === "span"
        ? `${layoutInfo.barPx + layoutInfo.availableRightPx}px`
        : "fit-content";

  const spanning = layoutInfo.placement === "span";
  const centred = layoutInfo.placement === "center";
  const onCard = theme.vars.palette.text.primary;
  // Asked only by the two placements that put glyphs on the bar. Every other label is read against
  // the card and never needs it, and the chart draws hundreds of them.
  const onBar = spanning || centred ? theme.palette.getContrastText(event.colour) : undefined;

  const labelStyle = {
    paddingLeft: leftPadding,
    paddingRight: rightPadding,
    left: leftPosition,
    width: labelWidth,
    /**
     * A span is the one label crossing from its bar onto the card, so no single colour has
     * contrast for the whole run — and a halo only softens the mismatch rather than removing it,
     * which shows up worst in the light scheme where the text is dark and the bar beneath it is
     * not.
     *
     * Painting the glyphs with a gradient clipped to the text switches colour at the bar's edge to
     * the pixel, so each half gets the contrast it would have had on its own. The stops are hard,
     * and measured from the element's left edge, which is the bar's left edge.
     */
    color: spanning ? "transparent" : centred ? onBar : onCard,
    backgroundImage: spanning
      ? `linear-gradient(to right, ${onBar} 0 ${layoutInfo.barPx}px, ${onCard} ${layoutInfo.barPx}px)`
      : undefined,
    WebkitBackgroundClip: spanning ? "text" : undefined,
    backgroundClip: spanning ? "text" : undefined,
  };

  return (
    <Box
      component="g"
      style={{ transform: `translate(${x}, ${y})` }}
      sx={ROW_SX}
    >
      {/* The bar carries the card as well as the label does. The label is the only thing hittable
          on a row where it sits in the gap beside its bar, which is most of them — and a finger
          aimed at an item aims at the bar, not at the words next to it. Two triggers rather than
          one on the row group: the group's box spans the whole gap the label is allowed to use, so
          a card anchored on it would open a chart's width away from the item it describes. */}
      <HoverCardTooltip
        colour={event.colour}
        title={<LazyTooltip render={event.tooltip} />}
        coarse={coarse}
      >
        <Box
          component="rect"
          width={width}
          height={BAR_HEIGHT}
          fill={event.colour}
          rx={BAR_RADIUS}
          style={{ width: `max(${width}, ${MIN_BAR_WIDTH}px)` }}
          sx={BAR_SX}
        />
      </HoverCardTooltip>
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
      >
        <HoverCardTooltip
          colour={event.colour}
          title={<LazyTooltip render={event.tooltip} />}
          coarse={coarse}
        >
          <Box
            sx={LABEL_SX}
            style={labelStyle}
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
