import type { YearMonthDay } from "./date";

/**
 * Lanes by the packed chart's rule along one axis of pixels: each item takes the first lane whose
 * last item has ended a `gap` before it begins, and opens a new one where none has. `items` must be
 * in the order the lanes are to be filled in; a lane is answered per item, in that order.
 */
const greedyLanes = (items: readonly { from: number; to: number }[], gap: number) => {
  /** Where each lane is free again. */
  const laneEnds: number[] = [];
  const lanes = items.map(({ from, to }) => {
    let lane = laneEnds.findIndex((end) => end <= from);
    if (lane === -1) lane = laneEnds.push(to + gap) - 1;
    else laneEnds[lane] = to + gap;
    return lane;
  });
  return { lanes, laneCount: Math.max(1, laneEnds.length) };
};

/**
 * Lanes for pictures standing on a line: each drawn from `x0`, as wide as its artwork, and holding
 * its lane until both its picture and its line, which ends at `x1`, have ended.
 *
 * The packed chart's rule in pixels rather than dates, because what has to clear the next item here
 * is a picture — a banner is three weeks of a year at a card's width — and not the span it starts.
 * `x0` is where the picture is drawn rather than where its item began, which differ where a picture
 * is held inside the card's edge. `items` must be in start order, which is also the order the lanes
 * are filled in.
 */
export const pictureLanes = (items: readonly { x0: number; x1: number; width: number }[], gap: number) =>
  greedyLanes(
    items.map(({ x0, x1, width }) => ({ from: x0, to: Math.max(x0 + width, x1) })),
    gap,
  );

/** An item of the year's log: when it ran, and whether it is still going. */
export interface LogEntry {
  start: YearMonthDay;
  end: YearMonthDay;
  open: boolean;
}

/** A row of the log: a month's heading, or an entry begun in it. */
type LogRow =
  | { kind: "month"; year: number; month: number; count: number; top: number; height: number }
  | { kind: "entry"; index: number; top: number; height: number };

/** One entry's line in the log's gutter, from where it ended (higher up) to where it began. */
interface LogLine {
  top: number;
  bottom: number;
  lane: number;
}

/**
 * The log of a year: time running down the page, newest first, a row per thing begun and a heading
 * per month, with each entry's run drawn as a line in a gutter of lanes beside the rows.
 *
 * Rows are ordinal — a quiet month is a thin heading, a busy week several rows — so a date's height
 * is read off the rows around it rather than off a scale: a line runs from the row it began on up to
 * the height its end would stand at, interpolated between the rows either side of that day. An entry
 * still going runs to the top; one begun before the window rises from the bottom, having no row of
 * its own; a point — a film, finished the day it began — is a line of no length, which a renderer
 * draws as a dot. Lines overlapping in height take lanes by the packed chart's rule, so what ran at
 * once stands side by side.
 */
export const yearLog = (
  entries: readonly LogEntry[],
  from: YearMonthDay,
  to: YearMonthDay,
  sizes: { entry: number; month: number; quiet: number; gap: number },
) => {
  // A date as a count of days from the window's start, so heights can be interpolated between
  // anchors; a date before the window is its first day and one after it the day past its last.
  const pastEnd = from.daysTo(to);
  const dayOf = (date: YearMonthDay) => (date < from ? 0 : to < date ? pastEnd : from.daysTo(date) - 1);

  const begun = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !(entry.start < from) && !(to < entry.start))
    .toSorted((a, b) => dayOf(b.entry.start) - dayOf(a.entry.start) || dayOf(b.entry.end) - dayOf(a.entry.end));

  const rows: LogRow[] = [];
  /** Heights at known days, newest first, which every other day is interpolated between. */
  const anchors: [number, number][] = [];
  const rowOf = new Map<number, number>();
  let y = 0;
  let next = 0;
  for (const month of from.toYearMonth().iterateToDate(to.toYearMonth()).toReversed()) {
    const opens = dayOf(month.startOfMonth());
    const inMonth: number[] = [];
    while (next < begun.length && dayOf(begun[next].entry.start) >= opens) inMonth.push(begun[next++].index);

    const height = inMonth.length ? sizes.month : sizes.quiet;
    anchors.push([dayOf(month.increment().startOfMonth()), y]);
    rows.push({ kind: "month", year: month.year, month: month.month, count: inMonth.length, top: y, height });
    y += height;
    for (const index of inMonth) {
      anchors.push([dayOf(entries[index].start), y + sizes.entry / 2]);
      rowOf.set(index, y + sizes.entry / 2);
      rows.push({ kind: "entry", index, top: y, height: sizes.entry });
      y += sizes.entry;
    }
    anchors.push([opens, y]);
  }
  const height = y;

  const heightAt = (day: number) => {
    if (day >= anchors[0][0]) return anchors[0][1];
    for (let j = 1; j < anchors.length; j++) {
      const [day1, y1] = anchors[j];
      const [day0, y0] = anchors[j - 1];
      if (day >= day1) return day0 === day1 ? y1 : y0 + ((day0 - day) / (day0 - day1)) * (y1 - y0);
    }
    return height;
  };

  const spans = entries.map((entry, index) => {
    const bottom = rowOf.get(index) ?? height;
    const top = entry.open || to < entry.end ? 0 : Math.min(bottom, heightAt(dayOf(entry.end) + 0.5));
    return { index, top, bottom };
  });

  // Lanes by the packed chart's rule, in height: a lane is free once its last line has ended, a gap
  // below, which is what keeps two lines touching end to end from reading as one.
  const order = spans.toSorted((a, b) => a.top - b.top || b.bottom - a.bottom);
  const { lanes, laneCount } = greedyLanes(
    order.map((span) => ({ from: span.top, to: span.bottom })),
    sizes.gap,
  );
  const lines: LogLine[] = new Array(entries.length);
  order.forEach((span, i) => (lines[span.index] = { top: span.top, bottom: span.bottom, lane: lanes[i] }));

  return { rows, lines, height, laneCount };
};
