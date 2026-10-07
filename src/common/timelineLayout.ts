import type { Colour } from "../utils/types";
import type { YearMonth, YearMonthDay } from "./date";
import { latestOf } from "./date";
import "../utils/arrayUtils";
import "../utils/mapUtils";

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
  /** Still going: `end` is today rather than a day it ended. */
  open?: boolean;
  /**
   * Packed into rows of its own beneath every other mark's, for an item running beside the rest
   * rather than among them: in the rows the rest share, it takes the row a later item would have
   * stood in and pushes that one down. Read by the packed chart alone — every other layout places
   * a mark by its dates.
   */
  beneath?: boolean;
  /**
   * The item's own artwork at a height, for a layout drawn in pictures: the domain's own card,
   * handed the press the layout gives every mark, so a picture opens what the mark's hover card
   * would. A thunk for the tooltip's reason — a year's pictures are built only while it is drawn.
   */
  picture?: (height: number, press: PicturePress) => React.ReactNode;
}

/**
 * What pressing a mark's picture does: open the mark's item as a press on its bar would, named for
 * the mark — a series' picture is its first book's cover, and the press opens the series.
 */
export interface PicturePress {
  onOpen: () => void;
  openLabel: string;
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
  ((start.daysTo(end) + padding) / totalDays) * 100;

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
 * `items` must already be in start order, shortest first where two share a start — a row's last
 * item is then also its latest-ending, which is what lets one date per row stand for the whole of
 * it. Returns a row index per item, in the order given.
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
 * Whether two spans run at once, by `assignRows`' own rule: a span is over on the day it ends, so
 * one begun that day follows it rather than running beside it. Anything deciding whether an item
 * would need a row of its own asks this, so it and the packing cannot disagree.
 */
export const overlaps = (
  a: { start: YearMonthDay; end: YearMonthDay },
  b: { start: YearMonthDay; end: YearMonthDay },
) => a.start < b.end && b.start < a.end;

/**
 * The items, less each one `apart` answers for that overlaps any other — another such item
 * included — so it is kept wherever it runs alone.
 *
 * For a layout with one lane to a row: an item running beside the rest opens a second lane for as
 * long as it runs, halving every band in the row, where alone it stands in the lane like any other.
 */
export const dropOverlapping = <T extends { start: YearMonthDay; end: YearMonthDay }>(
  items: readonly T[],
  apart: (item: T) => boolean,
): T[] => items.filter((item) => !apart(item) || !items.some((other) => other !== item && overlaps(item, other)));

/**
 * Start order, and the shorter item first where two start on the same day.
 *
 * A row is free again from the day its last item ends, so an item begun and finished in one day
 * hands the row straight on to something else begun that day — but only if it is placed first.
 * Left to the order the source happens to be in, a longer item takes the row, holds it past that
 * day, and the single-day one is pushed to a row of its own: three books out of 450 open a second
 * row on the Books timeline that way, and six open a second lane in two years of the stacked one,
 * each read in a day alongside a longer read begun the same morning. Every packing through
 * `assignRows` orders by it — the packed chart's rows and every strip's lanes — so the two cannot
 * disagree about whether a day's reads overlap.
 *
 * Earliest-ending first is also what the greedy packing wants generally — it frees each row as
 * soon as it can — so this can only lower the row count, never raise it.
 */
export const byStartThenShortest = (
  a: { start: YearMonthDay; end: YearMonthDay },
  b: { start: YearMonthDay; end: YearMonthDay },
) => {
  const start = a.start.toString().localeCompare(b.start.toString());
  return start !== 0 ? start : a.end.toString().localeCompare(b.end.toString());
};

/**
 * The packed rows, plus the highest row index used (-1 when there is no data). Links each item to
 * its row neighbours on the way through, which is what the label step measures its gaps against.
 *
 * An item marked `beneath` is packed against the others so marked alone, in rows numbered on from
 * the last the rest take. The rows come back in start order either way, which is what the chart
 * reads its first date off.
 */
export const packRows = (timelineData: TimelineData[]) => {
  // A start after its own end has nothing to draw: an open item runs to today, so a start typed
  // ahead of today is that shape, and `daysTo` throws on it once the bar is measured. Left off
  // here rather than by each caller, so a new timeline cannot forget the rule.
  const sortedData = timelineData.filter((row) => row.start.lte(row.end)).toSorted(byStartThenShortest);
  const aboveRows = assignRows(sortedData.filter((row) => !row.beneath));
  const beneathRows = assignRows(sortedData.filter((row) => row.beneath));
  const firstBeneath = aboveRows.reduce((last, row) => Math.max(last, row), -1) + 1;
  // Each half's rows are in the start order the whole list is in, so walking that list takes the
  // next of whichever half the item belongs to.
  let above = 0;
  let beneath = 0;
  const rows = sortedData.map((row) => (row.beneath ? firstBeneath + beneathRows[beneath++] : aboveRows[above++]));

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
  items.length ? latestOf(items, (item) => item.end) : undefined;

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

/** Where a band's name stands, in pixels of the track it is drawn on. */
export interface BandLabel {
  text: string;
  placement: Placement;
  /** The band's own width, as drawn. */
  barPx: number;
  /** A spanning name's run: the band and the gap after it, which it has claimed. */
  roomPx: number;
}

/**
 * Where each named band of one lane puts its name, by the packed chart's own rule (`decidePlacement`)
 * over the gaps between the bands: on the band where the name fits, else in the gap to its left, to
 * its right, or starting on the band and running on into the gap — and centred on the band, cut short,
 * where nothing holds it, as the packed chart leaves it rather than dropping the name.
 *
 * The gaps are the lane's own: from where the band before ended, or the track's start, to where the
 * band after begins, or the track's end. `rightUsed` carries along the lane as it does along a
 * packed row, a name spilling right having taken the gap the next band would spill left into.
 * `measure` answers a name's box, its glyphs and padding, in the pixels `widthPx` is in.
 */
export const placeBandLabels = (
  bands: readonly { key: string; startPercent: number; widthPercent: number; label?: string }[],
  widthPx: number,
  measure: (text: string) => number,
): Map<string, BandLabel> => {
  const placed = new Map<string, BandLabel>();
  const ordered = bands.toSorted((a, b) => a.startPercent - b.startPercent);
  let rightUsed = false;
  ordered.forEach((band, index) => {
    const x0 = (band.startPercent / 100) * widthPx;
    const barPx = (band.widthPercent / 100) * widthPx;
    const before = ordered[index - 1];
    const after = ordered[index + 1];
    const leftWidth = x0 - (before ? ((before.startPercent + before.widthPercent) / 100) * widthPx : 0);
    const rightWidth = (after ? (after.startPercent / 100) * widthPx : widthPx) - x0 - barPx;
    if (!band.label) {
      rightUsed = false;
      return;
    }
    const decision = decidePlacement({
      textWidth: measure(band.label),
      rectWidth: barPx,
      leftWidth,
      rightWidth,
      rightUsed,
    });
    rightUsed = decision.rightUsed;
    placed.set(band.key, { text: band.label, placement: decision.placement, barPx, roomPx: barPx + rightWidth });
  });
  return placed;
};

/** A group of items drawn as one span: from the first start among them to the last end. */
interface GroupSpan<T> {
  key: string;
  members: T[];
  start: YearMonthDay;
  end: YearMonthDay;
}

/**
 * Items gathered into one span per group, for a timeline drawing a series or a franchise as one bar.
 *
 * An item with no group stands as a span of its own under its own key, which is what a standalone
 * work is on such a chart. The members keep the order they were handed, so a caller naming the
 * span's lead or latest entry reads it off the one list. Open items arrive with today as their end,
 * so a series still running reaches today.
 */
export const groupSpans = <T extends { start: YearMonthDay; end: YearMonthDay }>(
  items: readonly T[],
  groupOf: (item: T) => string | undefined,
  keyOf: (item: T) => string,
): GroupSpan<T>[] => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groupOf(item);
    groups.setIfAbsent(group === undefined ? `item:${keyOf(item)}` : `group:${group}`, []).push(item);
  }
  return [...groups].map(([key, members]) => ({
    key,
    members,
    start: members.reduce((first, item) => (item.start < first ? item.start : first), members[0].start),
    end: latestOf(members, (item) => item.end),
  }));
};

/**
 * One mark per group, built from the marks its members draw as on their own, for a timeline drawing
 * a franchise as one bar: from the first start among them to the last end, named for the group
 * where it holds more than one member, coloured by the member that opened it and opening the card
 * and picture of the one met last. A member naming no group — `groupOf` blank — stays its own mark.
 * Each mark comes back with the member whose colour it wears, which is what a colour key names.
 *
 * `frontOf` is the picture a member draws when it fronts a group of several, where that differs
 * from its own: a season with a poster of its own fronts its show's line with the show's.
 */
export const groupMarks = <T>(
  items: readonly T[],
  markOf: (item: T) => TimelineData,
  groupOf: (item: T) => string,
  frontOf?: (item: T) => TimelineData["picture"],
): { mark: TimelineData; lead: T }[] =>
  groupSpans(
    items
      .map((item) => {
        const mark = markOf(item);
        return { item, mark, start: mark.start, end: mark.end };
      })
      .sortByKey("start", true),
    ({ item }) => groupOf(item).trim() || undefined,
    ({ mark }) => mark.key,
  ).map(({ key, members, start, end }) => {
    const lead = members[0];
    const latest = members.at(-1)!;
    return {
      lead: lead.item,
      mark: {
        key,
        name: members.length > 1 ? groupOf(lead.item) : lead.mark.name,
        tooltip: latest.mark.tooltip,
        colour: lead.mark.colour,
        start,
        end,
        open: members.some(({ mark }) => mark.open),
        picture: members.length > 1 && frontOf ? frontOf(latest.item) : latest.mark.picture,
      },
    };
  });
