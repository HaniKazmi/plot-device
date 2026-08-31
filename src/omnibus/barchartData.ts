import { Year } from "../common/date";
import type { Colour } from "../utils/types";
import type { OmniItem } from "./adapter";
import { mediumToColour, mediumToLabel, type Measure } from "./types";

/**
 * The union as the barchart pivot wants it: one row per item, keyed by medium and by the year the
 * item counts towards.
 *
 * The series is the medium and nothing else. Every other tab offers a select box over its own
 * columns, and this one has three columns the three sheets agree on — the whole reason the page
 * exists is that a game, a season and a film are only comparable as media, so a second grouping
 * here would be a question one of the home tabs already answers better.
 *
 * The date is a whole year, in every view including Cumulative. An item's year is an attribution
 * — the year a game was beaten, a season finished, a film seen — and only the film's is a date the
 * sheet actually holds. Feeding months would draw a curve stepping on 1 January and claim a
 * precision two of the three media do not carry.
 */
export const omniBarchartRows = (
  items: OmniItem[],
  measure: Measure,
): { name: string; date: Year; colour: Colour; value: number }[] =>
  items.map((item) => ({
    name: mediumToLabel(item.medium),
    date: Year.get(item.year),
    colour: mediumToColour(item.medium),
    // Exact hours, floored once per column by `postAggregate`: the share view takes its
    // percentages from these raw values, and the share of floored hours is not the share of the
    // hours behind them.
    value: measure === "Hours" ? item.hours : 1,
  }));
