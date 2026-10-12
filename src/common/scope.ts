import type { YearNumber } from "./date";
import type { YearType } from "./filterReducer";

/**
 * Whether the page is reading its whole library: everything up to the current year, which is
 * every row there is.
 *
 * A rule rather than a comparison written at each site, because three surfaces answer it — the
 * rail's picker lights on it, its menu marks the current item by it, and the vitals cards title
 * themselves through it — and a page that lit its control without changing its wording would be
 * saying two things about one state.
 */
export const isAllTime = (yearTo: YearNumber, yearType: YearType, currentYear: number): boolean =>
  yearType === "upto" && yearTo === currentYear;

/**
 * What the scope reads as: "All time", "In 2026" or "Up to 2019".
 *
 * The current year is a parameter rather than the module's own `CURRENT_YEAR`, so the wording is
 * a function of its arguments alone — the two vitals cards ask for the label of a reading the
 * page is not currently in, which a rule reaching for the clock could not answer.
 */
export const scopeLabel = (yearTo: YearNumber, yearType: YearType, currentYear: number): string => {
  if (yearType === "matching") return `In ${yearTo}`;
  return isAllTime(yearTo, yearType, currentYear) ? "All time" : `Up to ${yearTo}`;
};

/** A year scope as the reducer's `scope` action names it: both halves, one choice. */
export interface YearScope {
  yearTo: YearNumber;
  yearType: YearType;
}

/**
 * The scope `y` moves to: the year in progress from everything, and everything from any other
 * reading — the two scopes the picker's own menu offers by name, which are almost every use of it.
 */
export const toggledScope = (yearTo: YearNumber, yearType: YearType, currentYear: number): YearScope => ({
  yearTo: currentYear as YearNumber,
  yearType: isAllTime(yearTo, yearType, currentYear) ? "matching" : "upto",
});

/**
 * The scope a year either side of this one, keeping its reading, or `undefined` where the picker
 * offers no such year: nothing before the library's first, nothing after the current one.
 *
 * Everything is "up to" the current year, so it steps as that reading does — back to up to last
 * year, and forward to nothing — which keeps `,` and `.` each other's undo across the one step that
 * crosses into everything.
 */
export const steppedScope = (
  yearTo: YearNumber,
  yearType: YearType,
  delta: number,
  earliestYear: number,
  currentYear: number,
): YearScope | undefined => {
  const year = yearTo + delta;
  if (year < earliestYear || year > currentYear) return undefined;
  return { yearTo: year as YearNumber, yearType };
};
