import type { Colour } from "../utils/types";
import type { YearMonth, YearMonthDay } from "./date";
import "../utils/arrayUtils";

export interface TimelineData {
  name: string;
  /**
   * Built lazily: the timeline positions every row it is given, and the hover card is only ever
   * mounted for the one the pointer is over. As a node, each row's card and its footer labels
   * would be constructed up front and then held for the life of the layout, because `packRows`
   * copies every row and `useTextPlacement` keys a map by those copies.
   *
   * Must return something to show. Being a thunk, it cannot be inspected before the pointer
   * arrives, so MUI's "don't open an empty tooltip" check sees a wrapper that is always present
   * — a row with no card gets a blank box on hover rather than no tooltip at all.
   */
  tooltip: () => React.ReactNode;
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
 * The span from `start` to `end` as a percentage of the whole timeline grid, which is how every
 * element is positioned and sized. A negative `padding` shrinks the span, which is how a bar
 * leaves a gap before the next one.
 */
export const percentOfSpan = (start: YearMonthDay, end: YearMonthDay, totalDays: number, padding: number = 0) =>
  ((start.daysTo(end)! + padding) / totalDays) * 100;

export type TickLevel = "year" | "quarter" | "month";

export interface TimelineTick {
  /** Offset from the left edge of the grid, as a percentage of its full width. */
  percent: number;
  level: TickLevel;
  monthLabel: string;
  yearLabel: string;
  year: number;
}

/**
 * One walk of the month range, shared by the axis and by the gridlines drawn behind the bars.
 *
 * Both consume the same array so a year line and the year label beneath it cannot drift apart.
 * `start` must be the date the bars themselves are measured from, or every tick is offset by
 * however far the two origins differ.
 */
export const buildTicks = (start: YearMonth, end: YearMonth, totalDays: number): TimelineTick[] => {
  const origin = start.startOfMonth();

  return start.iterateToDate(end).map((month) => ({
    percent: percentOfSpan(origin, month.startOfMonth(), totalDays),
    level: month.month === 1 ? "year" : month.month % 3 === 1 ? "quarter" : "month",
    monthLabel: month.monthString(),
    yearLabel: month.year.toString(),
    year: month.year,
  }));
};

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
