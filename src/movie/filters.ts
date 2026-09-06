import {
  animeCategory,
  certificateCategory,
  franchiseCategory,
  FRANCHISE_KEY,
  present,
  type FilterSchema,
} from "../common/filterSchema";
import { CERTIFICATES, certificateToColour, genreToColour, type Certificate, type Predicate } from "../utils/types";
import type { FilterState } from "./filterUtils";
import { ANIME_GROUP, animeLabel, cinemaLabel, cinemaToColour, type Movie } from "./types";

/**
 * What guest mode hides on this tab: a film the sheet marks as anime, read off the same model field
 * the anime select is built over, so the mode and the control cannot hide by two definitions.
 *
 * Exported because the mode is applied to the library itself, above every tab: narrowing this
 * page's charts alone would leave a hidden film on screen through the franchise index and the
 * union, which are built from the library.
 */
export const guestFilter: Predicate<Movie> = (movie) => !movie.anime;

/** The outing first, as the sheet's own column reads and as `cinemaToColour` ramps it. */
const CINEMA_VALUES = ["Cinema", "Home"];

export const movieFilters: FilterSchema<Movie, FilterState> = {
  toggles: [{ key: "unscored", label: "Unscored films", hides: (movie) => movie.score !== undefined }],
  categories: [
    { key: "genre", label: "genre", valueOf: (movie) => movie.genre, colourFor: genreToColour },
    animeCategory("anime", animeLabel, ANIME_GROUP),
    // Both halves are a thing to look for — an outing and a night in — so neither is held back from
    // the box, where the anime split keeps only its marked half. "watched" rather than "cinema",
    // which would name the row after one of the two values standing under it.
    {
      key: "cinema",
      label: "watched",
      valueOf: cinemaLabel,
      options: (data) => present(CINEMA_VALUES, data, cinemaLabel),
      colourFor: cinemaToColour,
    },
    certificateCategory(
      "certificate",
      (movie) => movie.certificate,
      CERTIFICATES,
      (value, scheme) => certificateToColour(value as Certificate, scheme),
    ),
    { key: "director", label: "director", valueOf: (movie) => movie.director, searchable: true },
    franchiseCategory(FRANCHISE_KEY),
  ],
};
