import { Year } from "../common/date";
import { ageBandToColour, ageRatingBand, genreToColour, type Colour } from "../utils/types";
import type { OmniItem } from "./adapter";
import { mediumToColour, mediumToLabel, type Measure } from "./types";

/**
 * What the chart's series are, beyond the medium.
 *
 * The medium is the split the page opens on, because the whole reason three libraries share an
 * axis is that a game, a season and a film are only comparable as media. But it is not the only
 * vocabulary this tab teaches: the gallery already shelves the union by genre and by certificate,
 * and until those reach the time axis the reader can ask what a genre is made of but never when it
 * happened. Three series is also too few for two of the shell's four views to say anything — a
 * bump chart of three lines reports that games led most years, which the totals already showed.
 *
 * Franchise is not offered. It is the fourth thing the gallery groups on, and it answers with 115
 * series — a legend longer than the chart and a colour vocabulary the app does not hold for it.
 * Decade is not offered either: a decade is derived from the year, so plotting it against the year
 * draws each series into exactly one run of columns and nothing crosses.
 */
export const BARCHART_SPLITS = ["medium", "genre", "rating"] as const;

export type BarchartSplit = (typeof BARCHART_SPLITS)[number];

/** The series an item falls in. A certificate groups by age band, as every grouping here does. */
const splitName = (item: OmniItem, split: BarchartSplit): string => {
  switch (split) {
    case "medium":
      return mediumToLabel(item.medium);
    case "genre":
      return item.genre;
    case "rating":
      return ageRatingBand(item.rating);
  }
};

/**
 * The fill that series is drawn in.
 *
 * Each is the vocabulary the rest of the page already paints that field with, so a genre keeps the
 * hue it has in the gallery's swatch and in the genres band, and a certificate the hue of its
 * badge. All three sheets record genres from one list, so the shared ramp covers every value they
 * hold but `Other`, which takes the neutral `genreToColour` answers off-table with — one uncoloured
 * series against eleven, rather than a crash on a genre the ramp has not been given yet.
 */
const splitColour = (item: OmniItem, split: BarchartSplit): Colour => {
  switch (split) {
    case "medium":
      return mediumToColour(item.medium);
    case "genre":
      return genreToColour(item.genre);
    case "rating":
      return ageBandToColour(ageRatingBand(item.rating));
  }
};

/**
 * The union as the barchart pivot wants it: one row per item, keyed by the chosen series and by
 * the year the item counts towards.
 *
 * The date is a whole year, in every view including Cumulative. An item's year is an attribution
 * — the year a game was beaten, a season finished, a film seen — and only the film's is a date the
 * sheet actually holds. Feeding months would draw a curve stepping on 1 January and claim a
 * precision two of the three media do not carry.
 */
export const omniBarchartRows = (
  items: OmniItem[],
  measure: Measure,
  split: BarchartSplit,
): { name: string; date: Year; colour: Colour; value: number }[] =>
  items
    // A row with no value in the split column would open a series named "", which the legend and
    // the tooltip both render as a blank. Only genre can be empty, and only for a sheet row part
    // way through being filled in.
    .filter((item) => splitName(item, split))
    .map((item) => ({
      name: splitName(item, split),
      date: Year.get(item.year),
      colour: splitColour(item, split),
      // Exact hours, floored once per column by `postAggregate`: the share view takes its
      // percentages from these raw values, and the share of floored hours is not the share of the
      // hours behind them.
      value: measure === "Hours" ? item.hours : 1,
    }));
