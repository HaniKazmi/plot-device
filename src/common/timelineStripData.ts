import { YearMonthDay } from "./date";
import { assignRows, buildTicks, percentAtDate, percentOfSpan, type TimelineTick } from "./timelineLayout";
import "../utils/arrayUtils";

/** One tracked span. Domains extend this with whatever the band's colour and tooltip need. */
export interface StripSpan {
  key: string;
  start: YearMonthDay;
  end: YearMonthDay;
}

/**
 * The input span with its position on the strip. Positions are returned alongside the caller's
 * own fields rather than in place of them, so a domain does not have to key its records back out
 * of the result to colour them.
 */
export type StripBand<T extends StripSpan> = T & {
  /** Offset from the left edge of the strip, as a percentage of its full width. */
  startPercent: number;
  widthPercent: number;
  /** Row within the strip. Bands sharing a lane never overlap. */
  lane: number;
};

/**
 * A span of one day over two decades of strip is a fraction of a pixel, so without a floor the
 * shortest entries disappear entirely.
 */
const MIN_BAND_PERCENT = 0.5;

/**
 * Places each span on a fixed `epoch`–`today` scale, in as many lanes as it takes for no two
 * bands to overlap.
 *
 * Every band carries its own offset, so two spans covering the same dates — a franchise played
 * out of order, a replay running alongside a first playthrough — each land where they belong.
 * Chaining gaps and bars instead makes an overlap a negative gap, which drifts every later bar
 * along the strip, and lets the minimum width above push the total past 100% so that flex shrink
 * quietly distorts all of them.
 *
 * Lanes are what makes an overlap readable rather than merely correct. A band drawn over another
 * hides it completely, and the topmost element takes the pointer, so the buried span cannot even
 * be hovered for its dates. That is not a rare case: a year-only date resolves to the first of
 * January, so every entry a sheet records with no month stacks exactly on its same-year
 * neighbours.
 *
 * Only a genuine overlap opens one, though. Bands that merely abut — a season finished the day
 * the next was started, a game handed over to its sequel — stay in the lane they were in and are
 * tiled apart instead, because a lane costs every band in the strip a share of its height.
 *
 * Spans outside the scale are dropped rather than clamped to nothing: `daysTo` throws on a
 * backwards comparison, so a franchise reaching back before the epoch is a crash, not a
 * cosmetic problem. One that straddles the epoch keeps the part that fits.
 */
export const buildStrip = <T extends StripSpan>(spans: T[], epoch: YearMonthDay, today: YearMonthDay) => {
  const totalDays = epoch.daysTo(today)!;

  // Clamped before packing, so a lane answers for what is actually drawn in it — and because
  // `daysTo` throws on a backwards comparison. Clamping only ever raises a start to the epoch, so
  // the sort still holds afterwards.
  const clamped = spans
    .filter((span) => epoch.lte(span.end) && span.start.lte(today))
    .sortByKey("start", true)
    .map((span) => ({
      span,
      start: span.start.lte(epoch) ? epoch : span.start,
      end: today.lte(span.end) ? today : span.end,
    }));

  const lanes = assignRows(clamped);
  /** How far along each lane has actually been drawn, in percent. */
  const laneDrawnTo: number[] = [];

  const bands = clamped.map(({ span, start, end }, index) => {
    const widthPercent = Math.max(percentOfSpan(start, end, totalDays), MIN_BAND_PERCENT);
    // An offset is `percentAtDate` and a width is `percentOfSpan`, which is the distinction the two
    // measure: the band covers its own days, and it opens where the days before them end.
    //
    // Pulled back off the right edge, so the floored width of a span ending today cannot overhang
    // the strip it is measured against.
    let startPercent = Math.min(percentAtDate(epoch, start, totalDays), 100 - widthPercent);

    // Bands that abut are both drawn at the minimum width above, so laying them at their true
    // offsets puts them a fraction of a pixel apart and hides one behind the other — the very
    // stacking lanes exist to prevent, reappearing inside a lane, on spans put there precisely
    // because they do not overlap. Slide the later one clear instead, so a run of short spans
    // tiles into the block of activity it is.
    //
    // This is also what keeps several entries recorded on a single date visible. Giving each of
    // them a lane would work too, and costs far more: a lane is a share of the strip's whole
    // height, spent on every band in it, to separate spans that never actually overlapped.
    //
    // A lane whose last band already reaches the right edge has nowhere left to tile into. The
    // band overhangs and is clipped by the track rather than being pulled back to fit, because
    // pulling it back lands it on top of the band it was being moved clear of — and then every
    // later band in that lane clamps to the same spot, which is the stack this exists to break up.
    const lane = lanes[index];
    const drawnTo = laneDrawnTo[lane];
    if (drawnTo !== undefined && startPercent < drawnTo) startPercent = drawnTo;
    laneDrawnTo[lane] = startPercent + widthPercent;

    return { ...span, startPercent, widthPercent, lane } as StripBand<T>;
  });

  // A strip with nothing on it still has one lane, so a caller dividing its height by the count
  // never divides by zero.
  return { bands, laneCount: laneDrawnTo.length || 1 };
};

/**
 * The fewest years a window spans. A series met inside one season would otherwise be drawn across
 * the whole card, a fortnight per hundred pixels, which is the same blob at the other end of the
 * scale.
 */
const MIN_WINDOW_YEARS = 3;

export interface StripWindow {
  from: YearMonthDay;
  to: YearMonthDay;
}

/**
 * The years a card's strip is drawn across: the franchise's own, from the January of its first
 * start to the December of its last end, held open to at least three years.
 *
 * A window rather than the fixed epoch–today scale, because on that scale a year is fifty pixels
 * at card width and a two-week playthrough is a two-pixel band; the fixed scale survives as the
 * context bar beneath the strip, which brackets this window on it. Whole years at both ends so
 * every gridline inside the window is a January and the axis can be labelled with years alone.
 * The December end can fall after today; an open span still ends on today, since that is the end
 * its own record carries.
 */
export const stripWindow = (spans: readonly StripSpan[]): StripWindow => {
  const firstYear = Math.min(...spans.map((span) => span.start.year));
  const lastYear = Math.max(...spans.map((span) => span.end.year));
  const toYear = Math.max(lastYear, firstYear + MIN_WINDOW_YEARS - 1);
  return { from: YearMonthDay.get(firstYear, 1, 1), to: YearMonthDay.get(toYear, 12, 31) };
};

/**
 * How many years apart the axis labels stand, so they never collide at card width: every year
 * up to a dozen, then alternate years, then the round ones.
 */
export const yearLabelEvery = (years: number) => (years <= 12 ? 1 : years <= 24 ? 2 : 5);

/**
 * How many beads a row of the chain holds: as many as fit at the minimum pitch, never more than
 * there are. A chain wraps like a line of text rather than shrinking its beads, so a bead is the
 * same size on a fifty-entry franchise as on a five-entry one.
 */
export const beadsPerRow = (count: number, width: number, minPitch: number) =>
  Math.max(1, Math.min(count, Math.floor(width / minPitch)));

/**
 * Every year boundary inside the scale, for the gridlines behind the bands and the labels beneath
 * them.
 *
 * Taken from the same walk the full timeline's axis is built from, so the two cannot come to
 * disagree about where a year begins. That walk visits every month to label it; the strip has room
 * for years only, and building the months it discards costs one pass per domain, at module load,
 * against a scale that never changes.
 *
 * The epoch's own January is dropped: it is the strip's left edge, and a line there marks nothing.
 * `buildTicks` measures from the first of the epoch's month, so an epoch has to fall on the first
 * of a month or every tick sits however far the two origins differ — both are 1 January.
 */
export const stripYearTicks = (epoch: YearMonthDay, today: YearMonthDay): TimelineTick[] =>
  buildTicks(epoch.toYearMonth(), today.toYearMonth(), epoch.daysTo(today)!).filter(
    (tick) => tick.level === "year" && tick.year > epoch.year,
  );
