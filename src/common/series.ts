import type { LedgerRow, PanelStat } from "./Card";

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

/**
 * The ledger row placing an item in its series: "#3 · Revelation Space", or the series alone where
 * the sheet did not number it. Absent for a standalone.
 */
export const seriesRow = (item: InSeries): LedgerRow | undefined =>
  item.series
    ? {
        label: "Series",
        value: item.seriesNumber !== undefined ? `#${item.seriesNumber} · ${item.series}` : item.series,
      }
    : undefined;

/**
 * The hero's tile for the same fact: the series names the tile and its number is the figure. Absent
 * for an unnumbered entry, whose tile would have no figure to carry.
 */
export const seriesTile = (item: InSeries): PanelStat | undefined =>
  item.series && item.seriesNumber !== undefined ? { label: item.series, value: `#${item.seriesNumber}` } : undefined;
