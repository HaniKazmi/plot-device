import type { YearMonthDay } from "./date";
import { assignRows, buildTicks, percentOfSpan, type TimelineTick } from "./timelineLayout";
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
    // `daysTo` counts inclusively, which is what a width wants and an offset does not: the epoch
    // is day one of itself, and without the -1 every band starts a day late.
    //
    // Pulled back off the right edge too, so the floored width of a span ending today cannot
    // overhang the strip it is measured against.
    let startPercent = Math.min(percentOfSpan(epoch, start, totalDays, -1), 100 - widthPercent);

    // Bands that abut are both drawn at the minimum width above, so laying them at their true
    // offsets puts them a fraction of a pixel apart and hides one behind the other — the very
    // stacking lanes exist to prevent, reappearing inside a lane, on spans put there precisely
    // because they do not overlap. Slide the later one clear instead, so a run of short spans
    // tiles into the block of activity it is.
    //
    // This is also what keeps several entries recorded on a single date visible. Giving each of
    // them a lane would work too, and costs far more: a lane is a share of the strip's whole
    // height, spent on every band in it, to separate spans that never actually overlapped.
    const lane = lanes[index];
    const drawnTo = laneDrawnTo[lane];
    if (drawnTo !== undefined && startPercent < drawnTo) startPercent = Math.min(drawnTo, 100 - widthPercent);
    laneDrawnTo[lane] = startPercent + widthPercent;

    return { ...span, startPercent, widthPercent, lane } as StripBand<T>;
  });

  // A strip with nothing on it still has one lane, so a caller dividing its height by the count
  // never divides by zero.
  return { bands, laneCount: laneDrawnTo.length || 1 };
};

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
