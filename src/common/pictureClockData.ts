import { shapeRatioValues, type ArtworkShape } from "./cardArrangement";
import { shortYear, YearMonthDay } from "./date";
import { pictureLanes } from "./yearDetailData";
import "../utils/arrayUtils";

/** One calendar year on the clock: where its column starts and how wide it is. */
export interface ClockYear {
  year: number;
  x: number;
  width: number;
  /** How many days the year holds, read once rather than at every date placed in it. */
  days: number;
}

/** A run of years with nothing in them, drawn as one narrow fold rather than as empty columns. */
export interface ClockFold {
  from: number;
  to: number;
  x: number;
  width: number;
}

export interface ClockScale {
  years: ClockYear[];
  folds: ClockFold[];
  /** Where a day stands across the clock's width. A day in a folded year has no place, and stands at the fold. */
  xAt: (date: YearMonthDay) => number;
}

/** The most of the clock's width its folds may take between them, however many gaps there are. */
const FOLD_SHARE = 0.4;

/**
 * A scale for a set of spans on their own clock: every year any span touches gets a column of one
 * width, and every run of years none of them touches is folded to at most `foldWidth`.
 *
 * Folded because a franchise is met in bursts — Star Wars is six films over 2008–09, a game in
 * 2010, then nothing until 2015 — and a linear scale spends the gaps' width on nothing while the
 * bursts, where the pictures stand, are squeezed into lanes they do not need. A fold still says the
 * gap is there, which a scale skipping the years outright would not.
 *
 * A fold gives way in two ways. The folds together take no more than `FOLD_SHARE` of the width:
 * eight gaps at 44px are 352px, more than a phone's whole card, and the years would get nothing or
 * less. And a fold is never wider than the years it stands for would be as columns, or a gap of one
 * year would take more room than a year with pictures in it.
 */
export const clockScale = (
  spans: readonly { start: YearMonthDay; end: YearMonthDay }[],
  width: number,
  foldWidth: number,
): ClockScale => {
  const touched = new Set<number>();
  for (const { start, end } of spans) for (let year = start.year; year <= end.year; year++) touched.add(year);
  const covered = [...touched].toSorted((a, b) => a - b);
  const gaps = covered.flatMap((year, index) => {
    const gap = index > 0 ? year - covered[index - 1] - 1 : 0;
    return gap > 0 ? [gap] : [];
  });
  const fold = gaps.length ? Math.min(foldWidth, (width * FOLD_SHARE) / gaps.length) : 0;
  // Each fold capped at its own years' width as columns, the columns then sharing what the folds left.
  const columnsAt = (foldTotal: number) => (covered.length ? (width - foldTotal) / covered.length : width);
  const roughWidth = columnsAt(gaps.length * fold);
  const foldWidths = gaps.map((gap) => Math.min(fold, roughWidth * gap));
  const yearWidth = columnsAt(foldWidths.sum());

  const years: ClockYear[] = [];
  const folds: ClockFold[] = [];
  let x = 0;
  covered.forEach((year, index) => {
    const previous = covered[index - 1];
    if (previous !== undefined && year - previous > 1) {
      const folded = foldWidths[folds.length];
      folds.push({ from: previous + 1, to: year - 1, x, width: folded });
      x += folded;
    }
    // `daysTo` counts both ends, so the first of January to the last of December is the year's length.
    years.push({
      year,
      x,
      width: yearWidth,
      days: YearMonthDay.get(year, 1, 1).daysTo(YearMonthDay.get(year, 12, 31)),
    });
    x += yearWidth;
  });

  const columns = new Map(years.map((column) => [column.year, column]));
  const xAt = (date: YearMonthDay) => {
    const column = columns.get(date.year);
    if (!column) return folds.find((fold) => fold.from <= date.year && date.year <= fold.to)?.x ?? 0;
    // The first of January is day one, `daysTo` counting both ends.
    return column.x + ((YearMonthDay.get(date.year, 1, 1).daysTo(date) - 1) / column.days) * column.width;
  };
  return { years, folds, xAt };
};

/** How a fold names the years it holds: one year as `’16`, a run as `’11–’14`. */
export const foldLabel = ({ from, to }: Pick<ClockFold, "from" | "to">) =>
  from === to ? shortYear(from) : `${shortYear(from)}–${shortYear(to)}`;

/**
 * How tall a picture stands, largest first: the clock takes the first at which its pictures fit in
 * `MOST_LANES`. A burst of six films in a year is six lanes at a size a sparse franchise reads well
 * at, and four at the next size down.
 */
export const PICTURE_HEIGHTS = [64, 48, 36] as const;
export const MOST_LANES = 4;
/** Clear space after a picture before the next may stand in its lane. */
const PICTURE_GAP = 6;
/** The width a run of empty years folds to, at most. */
export const FOLD_WIDTH = 44;
/**
 * How many card widths the clock may run to, the packed chart's own four viewports at most: a tab's
 * library is hundreds of pictures, which at a card's width are lanes of thumbnails twenty deep.
 */
const WIDTH_STEPS = [1, 2, 3, 4] as const;

/** A clock laid out: its scale and width, the picture size, and where each item's picture stands. */
export interface ClockLayout {
  width: number;
  scale: ClockScale;
  pictureHeight: number;
  /** Per item, in the order given: where its picture stands, its lane, and where its line runs. */
  lefts: number[];
  lanes: number[];
  laneCount: number;
  spans: { lineStart: number; lineEnd: number }[];
}

/**
 * The clock for a set of spans, at the card's width where they fit and wider only where they do
 * not: the largest picture that keeps them to `MOST_LANES` at the card's own width, then the same
 * search at two, three and four widths, scrolled sideways. A franchise's few pictures fit the card
 * at full size; a tab's library runs to the packed chart's width before its pictures shrink to
 * nothing. Past every step it is the widest clock at the smallest size, however many lanes that is.
 */
export const clockLayout = (
  spans: readonly { start: YearMonthDay; end: YearMonthDay }[],
  cardWidth: number,
  shape: ArtworkShape,
): ClockLayout => {
  let layout: ClockLayout | undefined;
  for (const step of WIDTH_STEPS) {
    const width = cardWidth * step;
    const scale = clockScale(spans, width, FOLD_WIDTH);
    // Where each line runs is the same at every picture size; only where a picture can stand moves.
    const lines = spans.map((span) => ({ lineStart: scale.xAt(span.start), lineEnd: scale.xAt(span.end) }));
    for (const pictureHeight of PICTURE_HEIGHTS) {
      const pictureWidth = pictureHeight * shapeRatioValues[shape];
      // Held inside the clock for an item begun at its right edge, its line still starting where the
      // item did; packed from where the picture is drawn, so it cannot land on the one before it.
      const lefts = lines.map(({ lineStart }) => Math.min(lineStart, width - pictureWidth));
      const { lanes, laneCount } = pictureLanes(
        lines.map(({ lineEnd }, index) => ({ x0: lefts[index], x1: lineEnd, width: pictureWidth })),
        PICTURE_GAP,
      );
      layout = { width, scale, pictureHeight, lefts, lanes, laneCount, spans: lines };
      if (laneCount <= MOST_LANES) return layout;
    }
  }
  return layout!;
};
