/**
 * The shape every medium that numbers its runs carries: Games, Movies and Books each write a
 * `Series` and a `Series #` column, and each model reads them into these two fields.
 *
 * A series is a line inside one medium. The Harry Potter novels and the Harry Potter films are two
 * series under one franchise, numbered apart — Dune: Part Two is the second film where Dune Messiah
 * is the second book — so nothing here compares a series across media. Franchise is the join.
 */
export interface InSeries {
  series: string;
  seriesNumber?: number;
}

/**
 * Where an item sits in its series, worded the way a ledger row reads it: "#3 · Revelation Space",
 * or the series alone where the sheet did not number it. Empty for a standalone.
 */
export const seriesLabel = (item: InSeries): string =>
  item.series ? (item.seriesNumber !== undefined ? `#${item.seriesNumber} · ${item.series}` : item.series) : "";

/**
 * The hero's tile for the same fact: the series names the tile and its number is the figure. Absent
 * for an unnumbered entry, whose tile would have no figure to carry.
 */
export const seriesTile = (item: InSeries): { label: string; value: string } | undefined =>
  item.series && item.seriesNumber !== undefined ? { label: item.series, value: `#${item.seriesNumber}` } : undefined;
