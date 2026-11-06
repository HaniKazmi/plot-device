import { namesTheSameThing } from "../utils/stringUtils";
import type { LedgerRow } from "./Card";

/**
 * The shape every medium that numbers its runs carries: Games, Movies and Books each write a
 * `Series` and a `Series #` column, and each model reads them into these two fields.
 *
 * A series is a line inside one medium. The Harry Potter novels and the Harry Potter films are two
 * series under one franchise, numbered apart — Dune: Part Two is the second film where Dune Messiah
 * is the second book — so nothing here compares a series across media. Franchise is the join.
 */
export interface InSeries {
  /**
   * The series inside the franchise — Mistborn inside Cosmere — or `""` where the item stands alone.
   * Blank rather than the item's own name, unlike `franchise`: a one-entry series naming itself
   * would be a ledger row saying the title twice.
   */
  series: string;
  /**
   * Its place in `series`, absent for a standalone or an entry the sheet does not number.
   * Fractional for an entry the sheet slots between two numbered ones — a prequel at 0.5, a second
   * part at 7.1 — so the decimal is the order and not noise.
   */
  seriesNumber?: number;
}

/** "#3 · Revelation Space": an entry's place and its series, in the one wording the ledger and the hero share. */
const numbered = (series: string, seriesNumber: number) => `#${seriesNumber} · ${series}`;

/**
 * The ledger row placing an item in its series: "#3 · Revelation Space", or the series alone where
 * the sheet did not number it. Absent for a standalone.
 */
export const seriesRow = (item: InSeries): LedgerRow | undefined =>
  item.series
    ? {
        label: "Series",
        value: item.seriesNumber !== undefined ? numbered(item.series, item.seriesNumber) : item.series,
      }
    : undefined;

/**
 * The hero's statement of the same fact, beside the franchise its strip already names: "#3" where
 * the series and the franchise are one name — Mass Effect, Knives Out — and "#1 · Rain Wild
 * Chronicles", in the ledger row's own words, where it is a line inside a wider one. Absent for an
 * unnumbered entry, which has no place to state.
 *
 * Said in the strip's caption rather than as a figure: a tile labelled with a series name is the
 * one label long enough to wrap, and a wrapped tile stands the hero's words taller than its picture.
 */
export const seriesPlace = (item: InSeries, franchise: string): string | undefined => {
  if (!item.series || item.seriesNumber === undefined) return undefined;
  return namesTheSameThing(franchise, item.series) ? `#${item.seriesNumber}` : numbered(item.series, item.seriesNumber);
};

/**
 * The place a franchise strip's caption states: the hero's alone. An expanded card states the same
 * fact in its ledger's Series row, and a second statement of it in the strip above would be one
 * fact said twice on one card.
 */
export const stripPlace = (hero: boolean, item: InSeries | undefined, franchise: string): string | undefined =>
  hero && item ? seriesPlace(item, franchise) : undefined;
