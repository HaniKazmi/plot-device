import { CURRENT_YEAR } from "../common/date";
import type { Predicate } from "../utils/types";
import type { AgeRating } from "../utils/types";
import type { Measure, Movie } from "./types";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
  selectedPredicates,
} from "../common/filterReducer";

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
 * Named rather than inlined into `filters` because guest mode has to be applied a second time,
 * to the franchise index built from the unfiltered data — an index that skipped it would put
 * hidden films straight back on screen through a card strip.
 */
export const guestFilter: Predicate<Movie> = (movie) => !movie.anime;

export const filters = (state: Omit<FilterState, "filter">): Predicate<Movie> => {
  const predicates: Predicate<Movie>[] = [];

  if (!state.home) predicates.push((movie) => movie.cinema);
  if (!state.unscored) predicates.push((movie) => movie.score !== undefined);
  if (!state.anime) predicates.push(guestFilter);

  predicates.push(
    ...selectedPredicates(state.genre, (movie: Movie) => movie.genre),
    ...selectedPredicates(state.director, (movie: Movie) => movie.director),
    ...selectedPredicates(state.franchise, (movie: Movie) => movie.franchise),
    ...selectedPredicates(state.rating, (movie: Movie) => movie.rating),
  );

  // The shared predicate reads `startDate.year`, which for a film is simply the year it was
  // watched — one row, one date, so unlike Shows nothing here needs to diverge from it.
  predicates.push(...yearPredicates<Movie>(state));

  if (state.guestMode) {
    predicates.push(guestFilter);
  }

  return (movie: Movie) => predicates.every((p) => p(movie));
};

export const { useFilterReducer, reducer, initialState } = createFilterReducer<Movie, Measure, FilterState>(
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
    guestMode: false,
  },
  filters,
  (measure) => (measure === "Films" ? "Hours" : "Films"),
);
