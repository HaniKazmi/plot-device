import { CURRENT_YEAR } from "../common/date";
import type { Predicate } from "../utils/types";
import type { AgeRating } from "../utils/types";
import type { Measure, Movie } from "./types";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
} from "../common/filterReducer";
import { schemaPredicates } from "../common/filterSchema";
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

/**
 * The tab's predicate: every per-field rule the schema states, and then the year scope, which
 * belongs to no field and is a reading of the whole page rather than a narrowing of it.
 */
export const filters = (state: Omit<FilterState, "filter">): Predicate<Movie> => {
  // The shared cutoff reads `startDate.year`, which for a film is simply the year it was watched —
  // one row, one date, so unlike Shows nothing here needs to diverge from it.
  const predicates: Predicate<Movie>[] = [...schemaPredicates(movieFilters, state), ...yearPredicates<Movie>(state)];

  return (movie: Movie) => predicates.every((p) => p(movie));
};

export const {
  store: pageState,
  useFilterReducer,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<Movie, Measure, FilterState>(
  {
    home: true,
    unscored: true,
    anime: true,
    genre: [],
    director: [],
    franchise: [],
    rating: [],
    measure: "Films",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
  },
  filters,
);
