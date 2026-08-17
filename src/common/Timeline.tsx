import { Card, CardContent, Box, Tooltip, useTheme } from "@mui/material";
import { type ReactNode, useLayoutEffect, useRef, useState, type Ref } from "react";
import type { YearMonth, YearMonthDay } from "./date";
import type {} from "@mui/material/themeCssVarsAugmentation";
import {
  decidePlacement,
  packRows,
  type Placement,
  type PositionedTimelineData,
  type TimelineData,
} from "./timelineLayout";

export type { TimelineData };

// ============================================================================
// Constants
// ============================================================================
const AXIS_HEIGHT = 45;
const ROW_HEIGHT = 25;
const ROW_PADDING = 5;
const SVG_PADDING = 20;

// ============================================================================
// Types
// ============================================================================
type LayoutInfo = {
  placement: Placement;
  textPx: number;
  barPx: number;
  availableLeftPx: number;
};

const defaultLayout: LayoutInfo = {
  placement: "center",
  textPx: 0,
  barPx: 0,
  availableLeftPx: 0,
};

type ItemRefs = {
  rect: SVGRectElement | null;
  fo: SVGForeignObjectElement | null;
  text: HTMLDivElement | null;
};

// ============================================================================
// Utility Functions
// ============================================================================
/**
 * The span from `start` to `end` as a percentage of the whole timeline grid, which is how every
 * element is positioned and sized. A negative `padding` shrinks the span, which is how a bar
 * leaves a gap before the next one.
 */
const percentOfSpan = (start: YearMonthDay, end: YearMonthDay, totalDays: number, padding: number = 0) =>
  ((start.daysTo(end)! + padding) / totalDays) * 100 + "%";

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
  const [positionedTimelineData, maxRow] = packRows(timelineData);

  if (positionedTimelineData.length === 0) {
    return null;
  }

  const earliestStart = positionedTimelineData[0].start.startOfMonth();
  const latestEnd = positionedTimelineData.at(-1)!.end;
  const totalDays = earliestStart.daysTo(latestEnd)!;

  return (
    <Box sx={{ width: "100%", maxHeight: "90vh", overflowX: "auto", overflowY: "auto" }}>
      <div
        style={{ width: "400vw", maxHeight: "90vh", position: "relative", display: "flex", flexDirection: "column" }}
      >
        <div style={{ overflowY: "auto" }}>
          <TimelineGrid
            data={positionedTimelineData}
            startDate={earliestStart}
            endDate={latestEnd}
            totalHeight={maxRow * ROW_HEIGHT + SVG_PADDING * 2}
            totalDays={totalDays}
          />
        </div>
        <TimeAxis
          startDate={earliestStart.toYearMonth()}
          endDate={latestEnd.toYearMonth()}
          totalDays={totalDays}
        />
      </div>
    </Box>
  );
};

const TimelineGrid = ({
  data,
  startDate,
  endDate,
  totalHeight,
  totalDays,
}: {
  data: PositionedTimelineData[];
  startDate: YearMonthDay;
  endDate: YearMonthDay;
  totalHeight: number;
  totalDays: number;
}) => {
  const { layouts, setItemRef } = useTextPlacement(data);

  return (
    <svg
      height={totalHeight}
      width="100%"
    >
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
  const x = percentOfSpan(startDate, event.start, totalDays, 0.75);
  const width = percentOfSpan(event.start, event.end, totalDays, -0.75);
  const y = event.rowNumber * ROW_HEIGHT + SVG_PADDING + "px";
  const height = ROW_HEIGHT - ROW_PADDING;

  // The `<foreignObject>` acts as a container for the text that spans the *entire available empty space*
  // between the previous event and the next event on this row.
  const spaceLeftStart = event.previousDate ?? startDate;
  const availableLeft = percentOfSpan(spaceLeftStart, event.start, totalDays);

  const textContainerEnd = event.nextDate ?? endDate;
  const totalTextContainerWidth = percentOfSpan(spaceLeftStart, textContainerEnd, totalDays);

  // Shift the foreign object to start exactly where the previous event ended
  const foreignObjectX = `-${availableLeft}`;

  const leftPadding = layoutInfo.placement === "right" ? `${layoutInfo.barPx + 5}px` : "5px";
  const rightPadding = layoutInfo.placement === "left" ? `${layoutInfo.barPx + 5}px` : "5px";
  const leftPosition = `${layoutInfo.placement === "left" ? layoutInfo.availableLeftPx - layoutInfo.textPx : layoutInfo.availableLeftPx}px`;

  return (
    <g
      x={x}
      y={y}
      style={{ transform: `translate(${x}, ${y})` }}
    >
      <rect
        width={width}
        height={height}
        fill={event.colour}
        rx="5"
        ry="5"
        style={{ width: `max(${width}, 1px)` }}
        ref={rectRef}
      />
      <foreignObject
        x={foreignObjectX}
        y="0"
        width={totalTextContainerWidth}
        height={height}
        overflow="hidden"
        ref={foRef}
      >
        <Tooltip
          disableInteractive
          title={event.tooltip}
          slotProps={{
            tooltip: {
              sx: { backgroundColor: event.colour, width: "500px", maxWidth: "500px", minHeight: "325px" },
            },
          }}
        >
          <Box
            sx={{
              position: "fixed",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontSize: 14,
              paddingLeft: leftPadding,
              paddingRight: rightPadding,
              left: leftPosition,
              width: layoutInfo.placement === "center" ? `${layoutInfo.barPx}px` : "fit-content",
              color: (theme) =>
                layoutInfo.placement === "center"
                  ? theme.palette.getContrastText(event.colour)
                  : theme.vars.palette.text.primary,
            }}
            ref={textRef}
          >
            {event.name}
          </Box>
        </Tooltip>
      </foreignObject>
    </g>
  );
};

const TimeAxis = ({
  startDate,
  endDate,
  totalDays,
}: {
  startDate: YearMonth;
  endDate: YearMonth;
  totalDays: number;
}) => {
  const theme = useTheme();
  const startDateDay = startDate.startOfMonth();

  const ticks = startDate.iterateToDate(endDate).map((dateForTick) => {
    const date = dateForTick.startOfMonth();
    const x = percentOfSpan(startDateDay, date, totalDays);

    return {
      x,
      label: dateForTick.monthString(),
      isYear: dateForTick.month === 1,
      isQuarter: dateForTick.month % 3 === 1,
      yearLabel: dateForTick.year.toString(),
    };
  });

  return (
    <svg
      height={AXIS_HEIGHT}
      width={"100%"}
    >
      {ticks.map((tick) => (
        <g
          x={tick.x}
          key={tick.x}
          style={{ transform: `translateX(${tick.x})` }}
        >
          <line
            y1={tick.isYear ? 10 : tick.isQuarter ? 25 : 30}
            y2={AXIS_HEIGHT - 2}
            stroke={"#9B9B9B"}
            strokeWidth="1"
          />
          {tick.isQuarter && (
            <text
              x="5"
              y="20"
              style={{ fill: theme.vars.palette.text.secondary, fontSize: 16 }}
            >
              {tick.label}
            </text>
          )}
          {tick.isYear && (
            <text
              x="5"
              y="40"
              style={{ fill: theme.vars.palette.text.secondary, fontSize: 18, fontWeight: "bold" }}
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
