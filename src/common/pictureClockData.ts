import { shortYear, YearMonthDay } from "./date";

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

/**
 * A scale for a set of spans on their own clock: every year any span touches gets a column of one
 * width, and every run of years none of them touches is folded into a fixed `foldWidth`.
 *
 * Folded because a franchise is met in bursts — Star Wars is six films over 2008–09, a game in
 * 2010, then nothing until 2015 — and a linear scale spends the gaps' width on nothing while the
 * bursts, where the pictures stand, are squeezed into lanes they do not need. A fold still says the
 * gap is there, which a scale skipping the years outright would not.
 */
export const clockScale = (
  spans: readonly { start: YearMonthDay; end: YearMonthDay }[],
  width: number,
  foldWidth: number,
): ClockScale => {
  const touched = new Set<number>();
  for (const { start, end } of spans) for (let year = start.year; year <= end.year; year++) touched.add(year);
  const covered = [...touched].toSorted((a, b) => a - b);
  const foldCount = covered.filter((year, index) => index > 0 && year - covered[index - 1] > 1).length;
  const yearWidth = covered.length ? (width - foldCount * foldWidth) / covered.length : width;

  const years: ClockYear[] = [];
  const folds: ClockFold[] = [];
  let x = 0;
  covered.forEach((year, index) => {
    const previous = covered[index - 1];
    if (previous !== undefined && year - previous > 1) {
      folds.push({ from: previous + 1, to: year - 1, x, width: foldWidth });
      x += foldWidth;
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
