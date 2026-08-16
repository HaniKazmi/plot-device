import type { Colour } from "../utils/types";
import type { YearMonthDay } from "./date";
import "../utils/arrayUtils";
import "../utils/mapUtils";

export interface TimelineData {
  name: string;
  tooltip: React.ReactNode;
  colour: Colour;
  start: YearMonthDay;
  end: YearMonthDay;
}

export interface PositionedTimelineData extends TimelineData {
  rowNumber: number;
  nextDate?: YearMonthDay;
  previousDate?: YearMonthDay;
}

/**
 * Greedy interval packing. Sorts events chronologically and drops each into the first row
 * whose last event has already ended, so rows stay dense without any bar overlapping another.
 *
 * Returns the positioned events and the highest row index used (-1 when there is no data).
 */
export const packRows = (timelineData: TimelineData[]) => {
  if (timelineData.length === 0) return [[] as PositionedTimelineData[], 0] as const;

  const sortedData = timelineData.sortByKey("start", true);

  // The end date of the last event placed in each row.
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

    // Link neighbouring events in the same row so the layout step knows how much empty space
    // surrounds each bar and can spill a label into it.
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

export type Placement = "center" | "right" | "left";

/**
 * Where a label sits relative to its bar. A label that fits inside the bar is centred;
 * otherwise it spills into whichever gap can hold it, preferring the left so that a run of
 * labels does not chase the bars rightwards.
 *
 * `rightUsed` says whether an earlier event in the same row has already claimed the gap to
 * its right, which is the gap to this event's left.
 */
export const decidePlacement = ({
  textWidth,
  rectWidth,
  leftWidth,
  rightWidth,
  rightUsed,
}: {
  textWidth: number;
  rectWidth: number;
  leftWidth: number;
  rightWidth: number;
  rightUsed: boolean;
}): { placement: Placement; rightUsed: boolean } => {
  if (textWidth <= rectWidth) return { placement: "center", rightUsed: false };
  if (!rightUsed && textWidth < leftWidth) return { placement: "left", rightUsed: false };
  if (textWidth < rightWidth) return { placement: "right", rightUsed: true };
  // Nothing fits, so the label stays centred and overflows its bar rather than disappearing.
  return { placement: "center", rightUsed };
};
