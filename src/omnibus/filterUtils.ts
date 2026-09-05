import { CURRENT_YEAR } from "../common/date";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
} from "../common/filterReducer";
import { omniFilters } from "./filters";
import type { OmniItem } from "../common/medium";
import type { Measure } from "../app/types";

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
 * Guest mode pushes nothing here. It is applied per library by each domain's own rule before the
 * union is built (`visibleLibrary`), because the Now band elects from the domain records and would
 * otherwise headline a title the charts had already hidden.
 */
export const {
  store: pageState,
  useFilterReducer,
  filters,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<OmniItem, Measure, FilterState>({
  schema: omniFilters,
  initial: {
    // Hours is the unit the three media are actually comparable in. Items equates a hundred-hour
    // game with a two-hour film, which is a real question but not the one the page opens on.
    measure: "Hours",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
  },
  // The scope over the attribution year: an `OmniItem` holds no start date, and a game played
  // across a new year counts to the year it was finished, which is already on the record.
  yearRule: (state) => yearPredicates<OmniItem>(state, (item) => item.year),
});
