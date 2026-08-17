import type { Colour } from "../utils/types";
import type { YearMonthDay } from "./date";
import "../utils/arrayUtils";

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
  const sortedData = timelineData.sortByKey("start", true);

  // The last event placed in each row, which carries that row's end date.
  const lastInRow: PositionedTimelineData[] = [];

  const positionedRows = sortedData.map((row) => {
    let targetRow = lastInRow.findIndex((last) => row.start >= last.end);
    if (targetRow === -1) {
      targetRow = lastInRow.length;
    }

    const newRow: PositionedTimelineData = { ...row, rowNumber: targetRow };

    // Link neighbouring events in the same row so the layout step knows how much empty space
    // surrounds each bar and can spill a label into it.
    const last = lastInRow[targetRow];
    if (last) {
      last.nextDate = newRow.start;
      newRow.previousDate = last.end;
    }
    lastInRow[targetRow] = newRow;
    return newRow;
  });

  return [positionedRows, lastInRow.length - 1] as const;
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
