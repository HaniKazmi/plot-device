import { certificateCategory, franchiseCategory, type FilterSchema } from "../common/filterSchema";
import {
  ANIME,
  CERTIFICATES,
  animeToColour,
  certificateToColour,
  genreToColour,
  type Certificate,
  type Predicate,
} from "../utils/types";
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
    //
    // Shelved on the same terms Shows shelves its own, and under the same label, which is what
    // folds the two into one entry the box can open a single shelf from.
    {
      key: "anime",
      label: ANIME,
      hides: guestFilter,
      shelf: true,
      colourFor: (value, scheme) => animeToColour(value, scheme),
    },
  ],
  categories: [
    { key: "genre", label: "genre", valueOf: (movie) => movie.genre, colourFor: genreToColour },
    certificateCategory<Movie>(
      (movie) => movie.certificate,
      CERTIFICATES,
      (value, scheme) => certificateToColour(value as Certificate, scheme),
    ),
    { key: "director", label: "director", valueOf: (movie) => movie.director, searchable: true },
    franchiseCategory(),
  ],
};
