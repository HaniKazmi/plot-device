import { CURRENT_YEAR } from "../common/date";
import type { AgeRating } from "../utils/types";
import type { Measure, Movie } from "./types";
import { createFilterReducer, type BaseFilterState, type FilterDispatchFor } from "../common/filterReducer";
import { movieFilters } from "./filters";

export interface FilterState extends BaseFilterState<Movie, Measure> {
  /** Off leaves only cinema visits — the outings, against the whole library. */
  home: boolean;
  /** Off leaves only scored films, so the score views stop counting films nobody rated. */
  unscored: boolean;
  /** Whether anime counts — the analogue of the Pokémon switch on the games tab. */
  anime: boolean;
  genre: string[];
  director: string[];
  franchise: string[];
  rating: AgeRating[];
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
