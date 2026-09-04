import { assignPercents } from "../utils/mathUtils";
import { AGE_BANDS, ageRatingBand, releaseDecade } from "../utils/types";
import type { OmniItem } from "./adapter";
import { media, type Measure, type Medium } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/** One medium's slice of a row, in the page's measure. */
interface GenreBridgeSegment {
  medium: Medium;
  amount: number;
  percent: number;
}

/**
 * What a row of the bridge is keyed on: the vocabularies the gallery already shelves the union by,
 * less franchise — a hundred and sixty-nine rows of bars is a table, not a chart — plus the year,
 * which the decade coarsens. Every one is a field all four media record; a book answers the
 * certificate with nothing, and a row keyed on nothing is not drawn.
 */
export const BRIDGE_KEYS = ["genre", "year", "decade", "rating"] as const;

export type BridgeKey = (typeof BRIDGE_KEYS)[number];

/** How a row is named under each key: a genre as the sheet writes it, a certificate by its tier. */
export const bridgeValue = (item: OmniItem, key: BridgeKey): string => {
  switch (key) {
    case "genre":
      return item.genre;
    case "year":
      return String(item.year);
    case "decade":
      return releaseDecade(item.year);
    case "rating":
      return item.rating ? ageRatingBand(item.rating) : "";
  }
};

export interface GenreBridgeRow {
  /** The row's own name under the key it was built on. */
  name: string;
  /** The row's whole, in the page's measure: hours floored once as every total on this tab is, or a count. */
  amount: number;
  /** In the page's medium order, and only the media that actually logged hours here. */
  segments: GenreBridgeSegment[];
}

/**
 * Where a genre is watched or played, as each medium's share of it in the page's measure.
 *
 * The measure is the rail's, as every figure on the tab is counted in it: under Hours a row is the
 * time spent, and a genre reads as mostly games wherever the games are long; under Items every
 * entry weighs the same, and the same genre reads by what was picked up rather than how long it
 * held. The two are different questions of one composition, and the rail is where the reader asks
 * which — a section counting in its own unit would answer one the reader had switched away from.
 *
 * Only the primary genre counts. Shows and Movies carry secondary genres and Games carry themes
 * instead, so folding the secondaries in would give two of the three media a second vote each.
 *
 * A genre confined to one medium is drawn as a full bar rather than held back until a second
 * medium arrives. Requiring the crossing puts a cliff in the section: a genre accumulates at
 * whatever weight its one medium gives it, invisible the whole time, and a single entry logged
 * elsewhere then admits all of it at once — Abstract is 136 hours of games that one abstract film
 * would introduce at full size. A solid bar states the confinement, which is the fact the cliff
 * was hiding rather than a fact it was sparing the reader.
 *
 * All three sheets record the same genre vocabulary, so a genre meets itself across media without
 * a mapping written here. A vocabulary of its own on any sheet would stand its genres as bars of
 * their own beside the shared ones rather than dividing one bar between media.
 */
/**
 * How a key's rows run. Biggest first is the reading a composition invites, and is what genres
 * take; a vocabulary with an order of its own keeps it, since a year or a certificate read out of
 * that order is not the thing it names — years and decades newest first, the order every list on
 * the page states time in, and certificates youngest first, the order the boards print them in.
 */
const rowOrder = (
  key: BridgeKey,
): ((a: { name: string; total: number }, b: { name: string; total: number }) => number) => {
  switch (key) {
    case "genre":
      return (a, b) => b.total - a.total;
    case "year":
    case "decade":
      return (a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0);
    case "rating":
      return (a, b) => AGE_BANDS.indexOf(a.name) - AGE_BANDS.indexOf(b.name);
  }
};

export const genreBridge = (
  items: OmniItem[],
  key: BridgeKey = "genre",
  measure: Measure = "Hours",
): GenreBridgeRow[] => {
  const byGenre = items.reduce((index, item) => {
    const name = bridgeValue(item, key);
    if (name) index.setIfAbsent(name, []).push(item);
    return index;
  }, new Map<string, OmniItem[]>());

  return (
    [...byGenre.entries()]
      .map(([name, group]) => {
        // A medium with nothing in the row gets no segment: `assignPercents` floors every slice at
        // half a percent so it stays visible, and a visible slice of nothing is a claim the data does
        // not make. Exact hours, not floored ones, so a segment's share is the share of the time.
        const counts = media
          .map((medium) => {
            const own = group.filter((item) => item.medium === medium);
            return { medium, count: measure === "Hours" ? own.sum("hours") : own.length };
          })
          .filter(({ count }) => count > 0);

        // Exact, which is what the rows are ordered on below. `amount` is floored for display, so a
        // genre under an hour floors to 0; the row itself stays: forty-five minutes of a genre is
        // time actually spent in it, and a bar stating that beside a figure of zero hours is the
        // same rounding every total here makes.
        const total = counts.sum("count");

        return {
          name,
          total,
          amount: Math.floor(total),
          segments: assignPercents(counts, total).map(({ medium, count, percent }) => ({
            medium,
            amount: Math.floor(count),
            percent,
          })),
        };
      })
      // A genre every one of whose entries logged nothing has no bar to draw under Hours —
      // `assignPercents` is handed an empty list and answers one, leaving a named row with an empty
      // track beside a figure of zero. That is the only thing dropped here; how many media a genre
      // reached is not.
      .filter((row) => row.segments.length > 0)
      // The exact total comes off the row here because nothing drawing one has a use for a second,
      // unrounded figure.
      .toSorted(rowOrder(key))
      .map(({ name, amount, segments }) => ({ name, amount, segments }))
  );
};
