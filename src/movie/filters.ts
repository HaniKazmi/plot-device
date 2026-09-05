import { franchiseCategory, type FilterSchema } from "../common/filterSchema";
import { ageRatingToColour, genreToColour, type AgeRating, type Predicate } from "../utils/types";
import type { FilterState } from "./filterUtils";
import type { Movie } from "./types";

/**
 * What guest mode hides on this tab: a film the sheet marks as anime, which is also what the anime
 * toggle drops — one rule for the two, so the mode and the toggle cannot hide by two definitions.
 *
 * Exported because the mode is applied to the library itself, above every tab: narrowing this
 * page's charts alone would leave a hidden film on screen through the franchise index and the
 * union, which are built from the library.
 */
export const guestFilter: Predicate<Movie> = (movie) => !movie.anime;

export const movieFilters: FilterSchema<Movie, FilterState> = {
  toggles: [
    { key: "home", label: "Watched at home", hides: (movie) => movie.cinema },
    { key: "unscored", label: "Unscored films", hides: (movie) => movie.score !== undefined },
    // The toggle's rule is guest mode's own function and not a copy of it, so the two cannot come
    // to hide by different definitions of what anime is.
    { key: "anime", label: "Anime", hides: guestFilter },
  ],
  categories: [
    { key: "genre", label: "genre", valueOf: (movie) => movie.genre, colourFor: genreToColour },
    {
      key: "rating",
      label: "rating",
      valueOf: (movie) => movie.rating,
      colourFor: (value, scheme) => ageRatingToColour(value as AgeRating, scheme),
    },
    { key: "director", label: "director", valueOf: (movie) => movie.director, searchable: true },
    franchiseCategory(),
  ],
};
