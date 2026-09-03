import { CURRENT_YEAR } from "../common/date";
import {
  createFilterReducer,
  type BaseFilterState,
  type FilterDispatchFor,
  selectedPredicates,
  yearPredicates,
} from "../common/filterReducer";
import type { Predicate } from "../utils/types";
import type { OmniItem } from "./adapter";
import { media, type Measure } from "./types";

export interface FilterState extends BaseFilterState<OmniItem, Measure> {
  /** One switch per medium: the page's whole point is comparing them, so any subset is a view. */
  game: boolean;
  show: boolean;
  movie: boolean;
  book: boolean;
  genre: string[];
  franchise: string[];
}

export type FilterDispatch = FilterDispatchFor<FilterState>;

/**
 * Guest mode pushes no predicate here. It is applied per library by each domain's own rule before
 * the union is built (`visibleLibrary`), because the Now band elects from the domain records and
 * would otherwise headline a title the charts had already hidden.
 */
export const filters = (state: Omit<FilterState, "filter">): Predicate<OmniItem> => {
  const predicates: Predicate<OmniItem>[] = [];

  // The exported list rather than one written out again, so a medium is switchable here the
  // moment it exists rather than passing this predicate unchallenged.
  const shown = media.filter((medium) => state[medium]);
  if (shown.length < media.length) predicates.push((item) => shown.includes(item.medium));

  predicates.push(
    ...selectedPredicates(state.genre, (item: OmniItem) => item.genre),
    ...selectedPredicates(state.franchise, (item: OmniItem) => item.franchise),
  );

  // The shared cutoff over the attribution year: an `OmniItem` holds no start date, and a game
  // played across a new year counts to the year it was finished, which is already on the record.
  predicates.push(...yearPredicates<OmniItem>(state, (item) => item.year));

  return (item: OmniItem) => predicates.every((p) => p(item));
};

export const { useFilterReducer, reducer, initialState } = createFilterReducer<OmniItem, Measure, FilterState>(
  {
    game: true,
    show: true,
    movie: true,
    book: true,
    genre: [],
    franchise: [],
    // Hours is the unit the three media are actually comparable in. Items equates a hundred-hour
    // game with a two-hour film, which is a real question but not the one the page opens on.
    measure: "Hours",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
    guestMode: false,
  },
  filters,
  (measure) => (measure === "Hours" ? "Items" : "Hours"),
);
