import { Box, Tooltip, useTheme } from "@mui/material";
import type { TimelineData } from "./Timeline";
import type { YearMonth, YearMonthDay } from "./date";
import type {} from "@mui/material/themeCssVarsAugmentation";
import { useLayoutEffect, useRef, useState, type Ref } from "react";

const AXIS_HEIGHT = 45;
const ROW_HEIGHT = 25;
const ROW_PADDING = 5;
const SVG_PADDING = 20;

interface PositionedTimelineData extends TimelineData {
  rowNumber: number;
  nextDate?: YearMonthDay;
  previousDate?: YearMonthDay;
}
const TimeLineChart = ({ timelineData }: { timelineData: TimelineData[] }) => {
  if (timelineData.length === 0) {
    return null;
  }
  const [positionedTimelineData, maxRow] = positionedData(timelineData);

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
        <div>
          <TimeAxis
            startDate={earliestStart.toYearMonth()}
            endDate={latestEnd.toYearMonth()}
            totalDays={totalDays}
          />
        </div>
      </div>
    </Box>
  );
};

const positionedData = (timelineData: TimelineData[]) => {
  const sortedData = timelineData.sortByKey("start", true);
  const rowEndDates: YearMonthDay[] = [];
  const rows: Map<number, PositionedTimelineData[]> = new Map();

  const positionedRows = sortedData.map((row) => {
    let targetRow = -1;
    for (let i = 0; i < rowEndDates.length; i++) {
      if (row.start >= rowEndDates[i]) {
        targetRow = i;
        break;
      }
    }
    if (targetRow === -1) {
      targetRow = rowEndDates.length;
    }
    rowEndDates[targetRow] = row.end;

    const newRow: PositionedTimelineData = { ...row, rowNumber: targetRow };

    const dataForTargetRow = rows.setIfAbsent(targetRow, []);
    if (dataForTargetRow.length > 0) {
      const lastRow = dataForTargetRow[dataForTargetRow.length - 1];
      lastRow.nextDate = newRow.start;
      newRow.previousDate = lastRow.end;
    }
    dataForTargetRow.push(newRow);
    return newRow;
  });

  return [positionedRows, rowEndDates.length - 1] as const;
};

type LayoutInfo = {
  placement: "center" | "right" | "left";
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
  type ItemRefs = { rect: SVGRectElement | null; fo: SVGForeignObjectElement | null; text: HTMLDivElement | null };
  const [layouts, setLayouts] = useState<Map<PositionedTimelineData, LayoutInfo>>(new Map());
  const itemRefs = useRef(new Map<PositionedTimelineData, ItemRefs>());

  const setItemRef =
    <T extends keyof ItemRefs>(event: PositionedTimelineData, type: T) =>
    (el: ItemRefs[T] | null) => {
      const item = itemRefs.current.get(event) ?? { rect: null, fo: null, text: null };
      item[type] = el;
      itemRefs.current.set(event, item);
    };

  useLayoutEffect(() => {
    const map: typeof layouts = new Map();
    const rightUsed = [] as boolean[];
    itemRefs.current.forEach(({ text, fo, rect }, event) => {
      if (!text || !fo || !rect) {
        return;
      }

      const foBox = fo.getBoundingClientRect();
      const rectBox = rect.getBoundingClientRect();

      const textWidth = text.scrollWidth;
      const rectWidth = rectBox.width;
      const rightWidth = foBox.right - rectBox.right;
      const leftWidth = rectBox.left - foBox.left;

      let placement: LayoutInfo["placement"] = "center";

      if (textWidth <= rectWidth) {
        placement = "center";
        rightUsed[event.rowNumber] = false;
      } else if (!rightUsed[event.rowNumber] && textWidth < leftWidth) {
        placement = "left";
        rightUsed[event.rowNumber] = false;
      } else if (textWidth < rightWidth) {
        placement = "right";
        rightUsed[event.rowNumber] = true;
      }

      map.set(event, {
        availableLeftPx: leftWidth,
        barPx: rectWidth,
        textPx: textWidth,
        placement: placement,
      });
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayouts(map);
  }, [data]);

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
  const x = ((startDate.daysTo(event.start)! + 0.75) / totalDays) * 100 + "%";
  const y = event.rowNumber * ROW_HEIGHT + SVG_PADDING + "px";
  const width = ((event.start.daysTo(event.end)! - 0.75) / totalDays) * 100 + "%";
  const height = ROW_HEIGHT - ROW_PADDING;

  const spaceLeftStart = event.previousDate ?? startDate;
  const availableLeft = (spaceLeftStart.daysTo(event.start)! / totalDays) * 100 + "%";
  const textContainerEnd = event.nextDate ?? endDate;
  const totalTextContainerWidth = (spaceLeftStart.daysTo(textContainerEnd)! / totalDays) * 100 + "%";
  const foreignObjectX = `-${availableLeft}`;
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
              paddingLeft: layoutInfo.placement == "right" ? layoutInfo.barPx + 5 + "px" : "5px",
              paddingRight: layoutInfo.placement == "left" ? layoutInfo.barPx + 5 + "px" : "5px",
              left:
                layoutInfo.placement == "right"
                  ? layoutInfo.availableLeftPx + "px"
                  : layoutInfo.placement == "left"
                    ? layoutInfo.availableLeftPx - layoutInfo.textPx + "px"
                    : layoutInfo.availableLeftPx + "px",
              width: layoutInfo.placement == "center" ? layoutInfo.barPx + "px" : "fit-content",
              color: (theme) =>
                layoutInfo.placement == "center"
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
    const x = (startDateDay.daysTo(date)! / totalDays) * 100 + "%";

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

export default TimeLineChart;
