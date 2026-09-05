import { CURRENT_YEAR } from "../common/date";
import {
  createFilterReducer,
  type BaseFilterState,
  type FilterDispatchFor,
  yearPredicates,
} from "../common/filterReducer";
import { schemaPredicates } from "../common/filterSchema";
import { omniFilters } from "./filters";
import type { Predicate } from "../utils/types";
import type { OmniItem } from "./adapter";
import type { Measure } from "./types";

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
 * The tab's predicate: every per-field rule the schema states, and then the year scope, which
 * belongs to no field and is a reading of the whole page rather than a narrowing of it.
 *
 * Guest mode pushes nothing here. It is applied per library by each domain's own rule before the
 * union is built (`visibleLibrary`), because the Now band elects from the domain records and would
 * otherwise headline a title the charts had already hidden.
 */
export const filters = (state: Omit<FilterState, "filter">): Predicate<OmniItem> => {
  // The shared cutoff over the attribution year: an `OmniItem` holds no start date, and a game
  // played across a new year counts to the year it was finished, which is already on the record.
  const predicates: Predicate<OmniItem>[] = [
    ...schemaPredicates(omniFilters, state),
    ...yearPredicates<OmniItem>(state, (item) => item.year),
  ];

  return (item: OmniItem) => predicates.every((p) => p(item));
};

export const {
  store: pageState,
  useFilterReducer,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<OmniItem, Measure, FilterState>(
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
  },
  filters,
);
