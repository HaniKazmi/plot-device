import type { Colour } from "../utils/types";
import type { YearMonth, YearMonthDay } from "./date";
import "../utils/arrayUtils";

export interface TimelineData {
  /**
   * What tells this row from every other, which the name cannot.
   *
   * A title repeats: a replay is a second row for the same game, a remake carries its original's
   * exactly, and the same game logged on two platforms is two rows word for word. Two rows under
   * one React key are reconciled as one, so a bar and its label go missing — and adding the start
   * date does not close it, because two rows sharing a name *and* a date are exactly the pair that
   * overlaps, which is what puts them in different lanes rather than the same one.
   *
   * Required rather than optional: a row that forgot to answer would silently take the name back.
   */
  key: string;
  name: string;
  /**
   * Built lazily: the timeline positions every row it is given, and the hover card is only ever
   * mounted for the one the pointer is over. As a node, each row's card and its footer labels
   * would be constructed up front and then held for the life of the layout, because `packRows`
   * copies every row and `placeLabels` copies those copies again.
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
 * The span from `start` to `end` as a percentage of the whole timeline grid, which is the width
 * every element is drawn at — where it is drawn is `percentAtDate` below. A negative `padding`
 * shrinks the span, which is how a bar leaves a gap before the next one.
 */
export const percentOfSpan = (start: YearMonthDay, end: YearMonthDay, totalDays: number, padding: number = 0) =>
  ((start.daysTo(end)! + padding) / totalDays) * 100;

/**
 * Where a date sits on the grid: the days elapsed *before* it, as a percentage of the whole.
 *
 * This is the one convention every offset is measured in — an axis tick, a band on a strip, a bar
 * on the full chart — which is what lets a gridline for a day and a bar opening on that day land on
 * the same pixel. Measuring an offset with `percentOfSpan` instead puts it a day to the right of
 * every offset measured this way, because `daysTo` counts inclusively: that count is the width a
 * bar covering those days draws at, and one more than the distance to the first of them, the origin
 * being day one of itself with nothing elapsed before it.
 *
 * `padding` is added on top, in days, for a caller insetting a bar from its own date.
 */
export const percentAtDate = (origin: YearMonthDay, date: YearMonthDay, totalDays: number, padding: number = 0) =>
  percentOfSpan(origin, date, totalDays, padding - 1);

type TickLevel = "year" | "quarter" | "month";

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
    percent: percentAtDate(origin, month.startOfMonth(), totalDays),
    level: month.month === 1 ? "year" : month.month % 3 === 1 ? "quarter" : "month",
    monthLabel: month.monthString(),
    yearLabel: month.year.toString(),
    year: month.year,
  }));
};

/** A year's left edge on the grid, as a percentage of its full width. */
export interface YearMarker {
  year: number;
  percent: number;
}

/**
 * Where each calendar year begins on the grid.
 *
 * The first entry is pinned to 0 because a chart rarely starts in January: the opening year owns
 * the grid from its left edge, not from the January that precedes the data. When the data does
 * start in January that tick is the same marker, so years are folded to one entry each — two
 * markers naming the same year would give the shading two bands and the nav two chips.
 */
export const yearMarkers = (ticks: readonly TimelineTick[]): YearMarker[] => {
  if (ticks.length === 0) return [];

  const starts = [
    { year: ticks[0].year, percent: 0 },
    ...ticks.filter((tick) => tick.level === "year").map((tick) => ({ year: tick.year, percent: tick.percent })),
  ];

  return starts.filter((marker, index) => index === 0 || marker.year !== starts[index - 1].year);
};

/**
 * The year occupying a given percentage of the grid — the last one to have started by then, which
 * is what makes a position anywhere inside a year read as that year rather than as the next.
 *
 * `undefined` only before the first marker, which the callers reach when there is no data at all.
 */
export const yearAtPercent = (markers: readonly YearMarker[], percent: number) =>
  markers.findLast((marker) => marker.percent <= percent)?.year;

/**
 * The span of grid the year nav is a scale over: from the first marker, pinned at 0, to the last.
 */
const markerSpan = (markers: readonly YearMarker[]) => markers.at(-1)?.percent ?? 0;

/**
 * A pixel of tolerance, so a browser landing a hair short of a marker still names it.
 *
 * `scrollLeft` is fractional and a smooth scroll settles on whatever subpixel the compositor
 * reached, so an exact `<=` against a marker's own target lights the chip before it half the time.
 */
const SCROLL_TOLERANCE_PX = 1;

/**
 * The two directions of the year nav's mapping between a scroll offset and a position on the grid.
 *
 * The chart is four viewports wide, so `scrollLeft` only ever reaches `scrollWidth - clientWidth`
 * — three quarters of the grid. Reading a marker's own percentage as a scroll fraction therefore
 * leaves the last quarter of the years unreachable: every chip in it clamps to the same edge, and
 * the highlight saturates on whichever year that edge lands in.
 *
 * The whole marker span is mapped linearly onto the reachable range instead, which makes the rail
 * a position indicator over that range rather than a set of anchors. The first chip still lands
 * its year line exactly on the left edge and the last still reaches the end of the chart; the
 * years between land progressively further into the viewport, so a lit chip names a year on
 * screen rather than the one at the left edge. That is the price of every chip being reachable
 * and of the mapping being a bijection — clicking a chip lights that chip, and dragging the chart
 * moves the highlight through every year in turn.
 */
export const percentAtScroll = (markers: readonly YearMarker[], scrollLeft: number, maxScroll: number) => {
  const span = markerSpan(markers);
  // The whole chart fits, so there is no position to read: the reader can see the latest year,
  // which is the end the chart opens at.
  if (maxScroll <= 0) return span;
  return Math.min(span, ((scrollLeft + SCROLL_TOLERANCE_PX) / maxScroll) * span);
};

/** The inverse: where to scroll so that `percent` of the grid is the position being read. */
export const scrollAtPercent = (markers: readonly YearMarker[], percent: number, maxScroll: number) => {
  const span = markerSpan(markers);
  if (span <= 0 || maxScroll <= 0) return 0;
  return (percent / span) * maxScroll;
};

/**
 * How far a jump has to travel before the animation stops being worth anything, as a multiple of
 * the viewport it crosses.
 */
const FAR_JUMP_VIEWPORTS = 1.5;

/**
 * How a jump of `distance` across a `viewport` should move: animated, or straight there.
 *
 * A smooth scroll runs longer the further it travels, and both surfaces this serves are several
 * viewports long — a chart four wide, a wall a thousand cards deep. Past a viewport and a half the
 * content in between passes too fast to follow, so the animation is only a wait, and the rail's own
 * highlight is what orients the reader either way. Short hops keep it, because over that distance
 * the movement is what says the view scrolled rather than changed.
 *
 * `distance` is signed, so a caller hands over the delta it already has.
 */
export const scrollBehaviourFor = (distance: number, viewport: number): ScrollBehavior =>
  Math.abs(distance) > viewport * FAR_JUMP_VIEWPORTS ? "auto" : "smooth";

/**
 * Greedy interval packing: each item goes in the first row whose last item has already ended, so
 * rows stay dense without any two items in one row overlapping.
 *
 * Taking the emptiest fitting row rather than the first would hand every label a wider gap to be
 * written in, and costs no height — but it spreads events evenly down the chart instead of
 * settling them towards the top, and the even scatter reads worse than the clipped labels it
 * buys. Density is the shape of this chart; leave it alone.
 *
 * A row is free from the day its last item ends rather than from the day after: an end date is
 * the day that item finished, and the next may start the same day. Splitting a handoff across
 * rows would say both were going at once.
 *
 * `items` must already be in start order — a row's last item is then also its latest-ending,
 * which is what lets one date per row stand for the whole of it. Returns a row index per item,
 * in the order given.
 */
export const assignRows = <T extends { start: YearMonthDay; end: YearMonthDay }>(items: readonly T[]) => {
  /** The day each row's last item ends, from which the row is free again. */
  const rowEnds: YearMonthDay[] = [];

  return items.map((item) => {
    // `lte` stringifies both sides and `toString` rebuilds the string every call, so the probe
    // would re-derive this one once per row it walks past.
    const start = item.start.toString();
    let row = rowEnds.findIndex((end) => end.toString() <= start);
    if (row === -1) row = rowEnds.push(item.end) - 1;
    else rowEnds[row] = item.end;
    return row;
  });
};

/**
 * The packed rows, plus the highest row index used (-1 when there is no data). Links each item to
 * its row neighbours on the way through, which is what the label step measures its gaps against.
 */
export const packRows = (timelineData: TimelineData[]) => {
  const sortedData = timelineData.sortByKey("start", true);
  const rows = assignRows(sortedData);

  // The last event placed in each row.
  const lastInRow: PositionedTimelineData[] = [];

  const positionedRows = sortedData.map((row, index) => {
    const targetRow = rows[index];
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

/**
 * The last day any item runs to, which is where the grid has to end.
 *
 * Not the end of the last item in start order, though `packRows` hands its rows back in exactly
 * that order: the two agree *within* a row, because a row only accepts an item starting after the
 * previous one ended, and nowhere else. An item still in progress is given today as its end, so
 * whenever anything shorter started after it the last row in start order ends first — and a grid
 * measured to there is short by the difference, clipping the longer bar at its right edge and
 * stopping the axis a month before the data.
 *
 * Reduced rather than `Math.max`ed: `PlainDate.valueOf` answers a string, so the numeric form
 * would take the maximum of a list of `NaN`.
 */
export const latestEnd = (items: readonly { end: YearMonthDay }[]): YearMonthDay | undefined =>
  items.reduce<YearMonthDay | undefined>(
    (latest, item) => (!latest || item.end > latest ? item.end : latest),
    undefined,
  );

export type Placement = "center" | "right" | "left" | "span";

/**
 * Where a label sits relative to its bar. A label that fits inside the bar is centred;
 * otherwise it spills into whichever gap can hold it, preferring the left so that a run of
 * labels does not chase the bars rightwards.
 *
 * A label too long for either gap on its own can still be whole if it starts on its bar and
 * runs off the end into the gap, using both. That is `span`, and it is the last resort before
 * clipping: it only applies when the two together hold the entire label, because it claims the
 * gap from the next event, and a claim that still ends in an ellipsis is one the neighbour
 * should have had. Spanning text crosses from the bar's colour onto the card, so it is the one
 * placement that cannot take its contrast from either.
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
  if (!rightUsed && textWidth < rectWidth + rightWidth) return { placement: "span", rightUsed: true };
  // Nothing fits, so the label stays centred and overflows its bar rather than disappearing.
  return { placement: "center", rightUsed };
};
