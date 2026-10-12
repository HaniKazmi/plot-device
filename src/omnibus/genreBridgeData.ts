import { assignPercents } from "../utils/mathUtils";
import { CERTIFICATE_BANDS, STYLES, releaseDecade } from "../utils/types";
import type { OmniItem } from "../common/medium";
import { galleryValue } from "../app/galleryData";
import { franchiseIndex } from "../common/franchiseIndex";
import { media, type Measure, type Medium } from "../app/types";
import "../utils/arrayUtils";

/** One medium's slice of a row, in the page's measure. */
interface GenreBridgeSegment {
  medium: Medium;
  amount: number;
  percent: number;
}

/**
 * What a row of the bridge is keyed on: the vocabularies the gallery already shelves the union by,
 * less franchise — a hundred and sixty-nine rows of bars is a table, not a chart — plus the year,
 * which the decade coarsens, and the style, a union field read through `galleryValue`. A book
 * answers the style with nothing, and a row keyed on nothing is not drawn.
 */
export const BRIDGE_KEYS = ["genre", "year", "decade", "certificate", "style"] as const;

export type BridgeKey = (typeof BRIDGE_KEYS)[number];

/**
 * How a row is named under each key: a genre or a style as the sheet writes it, a certificate by
 * its tier.
 */
export const bridgeValue = (item: OmniItem, key: BridgeKey): string => {
  switch (key) {
    case "genre":
      return item.genre;
    case "year":
      return String(item.year);
    case "decade":
      return releaseDecade(item.year);
    case "certificate":
    case "style":
      return galleryValue(item, key);
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

/** A set of items in the page's measure, exactly: a total is floored once, where it is shown. */
const amountOf = (items: OmniItem[], measure: Measure) => (measure === "Hours" ? items.sum("hours") : items.length);

/** Where a style stands in `STYLES`, asked of the row's name, which the type holds as a plain string. */
const styleRank = (name: string) => (STYLES as readonly string[]).indexOf(name);

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
 * the page states time in, certificates youngest first, the order the boards print them in, and
 * styles in the order `STYLES` declares, the order every style band and chip row on the page uses.
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
    case "certificate":
      return (a, b) => CERTIFICATE_BANDS.indexOf(a.name) - CERTIFICATE_BANDS.indexOf(b.name);
    case "style":
      return (a, b) => styleRank(a.name) - styleRank(b.name);
  }
};

export const genreBridge = (
  items: OmniItem[],
  key: BridgeKey = "genre",
  measure: Measure = "Hours",
): GenreBridgeRow[] => {
  // The franchise index's grouping under another accessor: a row is every item answering one
  // value, and an item answering none — a book asked for its style — belongs to no row.
  const byGenre = franchiseIndex(items, (item) => bridgeValue(item, key));

  return (
    [...byGenre.entries()]
      .map(([name, group]) => {
        // A medium with nothing in the row gets no segment: `assignPercents` floors every slice at
        // half a percent so it stays visible, and a visible slice of nothing is a claim the data does
        // not make. Exact hours, not floored ones, so a segment's share is the share of the time.
        const counts = media
          .map((medium) => {
            return {
              medium,
              count: amountOf(
                group.filter((item) => item.medium === medium),
                measure,
              ),
            };
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

/** One medium's row of the bridge turned over: how its whole divides between the key's values. */
export interface MediumBridgeRow {
  medium: Medium;
  /** The medium's whole, in the page's measure, floored once as every total on this tab is. */
  amount: number;
  /** One per value the medium logged anything under, in the key's own row order. */
  segments: { name: string; amount: number; percent: number }[];
}

/**
 * The bridge turned over: a row per medium, divided between the key's values — what the games are
 * made of by genre, against what the films are. The values run in the order `genreBridge` lists them
 * as rows, so a genre stands at one place along every medium's bar and the bars read down a column
 * as the unturned rows read across one. A medium logging nothing under any value has no row, and a
 * value it logged nothing under no segment, on the unturned bridge's own rule. `order` is those
 * rows' names, which the caller already holds for the unturned rows it draws the key from.
 */
export const mediumBridge = (items: OmniItem[], key: BridgeKey, measure: Measure, order: string[]): MediumBridgeRow[] =>
  media
    .map((medium) => {
      const byValue = franchiseIndex(
        items.filter((item) => item.medium === medium),
        (item) => bridgeValue(item, key),
      );
      const counts = order
        .map((name) => ({ name, count: amountOf(byValue.get(name) ?? [], measure) }))
        .filter(({ count }) => count > 0);
      const total = counts.sum("count");

      return {
        medium,
        amount: Math.floor(total),
        segments: assignPercents(counts, total).map(({ name, count, percent }) => ({
          name,
          amount: Math.floor(count),
          percent,
        })),
      };
    })
    .filter((row) => row.segments.length > 0);
