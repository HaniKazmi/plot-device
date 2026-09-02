import type { PanelSubtitlePart } from "../common/Card";
import { genreToColour, type Scheme } from "../utils/types";
import type { Movie } from "./types";

/**
 * How a film is named wherever it is promoted: who directed it, then the genre, wearing the
 * swatch its ledger row and every genre wedge on the tab wear.
 *
 * Shared rather than assembled at each site, so the hero, the hover card and the Omnibus's Now
 * card cannot come to name one film two ways.
 */
export const movieSubtitle = (movie: Movie, scheme: Scheme): PanelSubtitlePart[] => [
  { text: movie.director },
  { text: movie.genre, swatch: genreToColour(movie.genre, scheme) },
];
