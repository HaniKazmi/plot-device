import type { YearNumber } from "../common/date";
import { franchiseIndex } from "../common/franchiseIndex";
import { countByMedium, type OmniItem } from "../common/medium";
import { workOf } from "../app/galleryData";
import { measureOf } from "../app/library";
import { omniWork } from "../app/media";
import { media, type Measure, type Medium } from "../app/types";
import { closedLaterFirst } from "./adapter";

/** How many of a franchise's works its card pictures, newest first. */
export const PICTURES_PER_FRANCHISE = 4;

/** One franchise as a card: how much of it there is, when it ran, which media hold it, and its entries. */
export interface FranchiseCard {
  franchise: string;
  /** The page's measure over every entry: hours, or entries. */
  figure: number;
  from: YearNumber;
  to: YearNumber;
  /** Entries per medium the franchise holds, in the page's medium order. */
  media: { medium: Medium; entries: number }[];
  /** Every entry, which the card pictures through `franchiseWorks` only once it is drawn. */
  entries: OmniItem[];
}

/** Newest first: the year an entry counts towards, then the day it closed, an open one the newest. */
const newestFirst = (a: OmniItem, b: OmniItem) => b.year - a.year || closedLaterFirst(a, b);

/**
 * A franchise's works newest first, each once — a show standing for every season of it met, the
 * picture a card fronting the whole work wears. What the franchise's own card pictures, and what
 * its page opens on, so the page reads as the card opened out. A work is the one its medium's own
 * module names (`workOf`), so two films sharing a title stay two.
 */
export const franchiseWorks = (entries: readonly OmniItem[]): OmniItem[] => {
  const works = new Map<unknown, OmniItem>();
  for (const item of entries.toSorted(newestFirst)) {
    const work = workOf(item);
    if (!works.has(work)) works.set(work, omniWork(item));
  }
  return [...works.values()];
};

/**
 * Every franchise of the union, biggest first in the page's measure, as the franchise figure on the
 * vitals counts them: on the raw franchise column, a standalone work being a franchise of one. A
 * tie goes to the one met more recently.
 */
export const topFranchises = (items: readonly OmniItem[], measure: Measure): FranchiseCard[] =>
  [...franchiseIndex(items, (item) => item.franchise).entries()]
    .map(([franchise, entries]) => {
      const years = entries.map((item) => item.year);
      const counts = countByMedium(entries);
      return {
        franchise,
        figure: measureOf(entries, measure),
        from: Math.min(...years) as YearNumber,
        to: Math.max(...years) as YearNumber,
        media: media.flatMap((medium) => (counts[medium] ? [{ medium, entries: counts[medium] }] : [])),
        entries,
      };
    })
    .toSorted((a, b) => b.figure - a.figure || b.to - a.to);
