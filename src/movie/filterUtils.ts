import { CURRENT_YEAR } from "../common/date";
import type { Certificate } from "../utils/types";
import type { Measure, Movie } from "./types";
import { createFilterReducer, type BaseFilterState, type FilterDispatchFor } from "../common/filterReducer";
import { movieFilters } from "./filters";

export interface FilterState extends BaseFilterState<Movie, Measure> {
  /** Which of the outings and the nights in the page holds, empty being both. */
  cinema: string[];
  /** Off leaves only scored films, so the score views stop counting films nobody rated. */
  unscored: boolean;
  /** Which side of the anime split the page holds, empty being both, as Shows reads it. */
  anime: string[];
  genre: string[];
  director: string[];
  franchise: string[];
  certificate: Certificate[];
}

export type FilterDispatch = FilterDispatchFor<FilterState>;

export const {
  store: pageState,
  useFilterReducer,
  filters,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<Movie, Measure, FilterState>({
  schema: movieFilters,
  initial: { measure: "Films", yearType: "upto", yearTo: CURRENT_YEAR },
  // A film's start date is the day it was watched — one row, one date, so unlike Shows the shared
  // cutoff over that year is the whole rule.
  yearOf: (movie) => movie.startDate.year,
});
