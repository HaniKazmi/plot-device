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
