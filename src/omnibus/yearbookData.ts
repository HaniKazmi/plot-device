import type { YearNumber } from "../common/date";
import type { OmniItem } from "../common/medium";
import { media } from "../app/types";
import type { Medium } from "../utils/types";
import { closedLaterFirst } from "./adapter";

/** One year of the union: everything it counts, and the work each medium is remembered by. */
export interface YearbookYear {
  year: YearNumber;
  items: OmniItem[];
  /** One per medium the year holds, in the page's medium order. */
  headliners: OmniItem[];
}

/**
 * Which of two works a year is remembered by, before the other.
 *
 * The time spent on it, except for a film: a film's hours are its runtime, so the longest film of a
 * year would lead it whatever was thought of it, where its score says which one mattered. A tie
 * goes to the one closed later, the year's end being nearer to how it is remembered; a work still
 * going counts as the latest of all.
 */
const ahead = (medium: Medium) => (a: OmniItem, b: OmniItem) => {
  const by = medium === "movie" ? (item: OmniItem) => item.score ?? -1 : (item: OmniItem) => item.hours;
  const difference = by(b) - by(a);
  return difference || closedLaterFirst(a, b);
};

/**
 * The union a year at a time, newest first: each year's own items, counted on the year they count
 * towards (`OmniItem.year`) as the By year chart counts them, and the one work per medium that
 * stands for it.
 */
export const yearbook = (items: readonly OmniItem[]): YearbookYear[] => {
  const byYear = Map.groupBy(items, (item) => item.year);
  return [...byYear.entries()]
    .toSorted(([a], [b]) => b - a)
    .map(([year, inYear]) => ({
      year,
      items: inYear,
      headliners: media.flatMap((medium) => {
        const ofMedium = inYear.filter((item) => item.medium === medium);
        return ofMedium.length ? [ofMedium.toSorted(ahead(medium))[0]] : [];
      }),
    }));
};
