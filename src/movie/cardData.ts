import type { LedgerRow, PanelSubtitlePart } from "../common/Card";
import type { FranchiseEntry } from "../common/franchiseUnion";
import type { ReactNode } from "react";
import { formatDate } from "../common/date";
import { ageRatingToColour, franchiseToColour, genreToColour, mediumFills, type Scheme } from "../utils/types";
import { movieItemKey } from "./statsData";
import { namesTheSameThing } from "../utils/stringUtils";
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

/**
 * The facts that are not figures.
 *
 * A row carries a swatch exactly where the app speaks that field's colour somewhere else — the
 * genre shares the shows tab's vocabulary, the rating the games tab's map.
 */
export const movieRows = (movie: Movie, scheme: Scheme): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Watched", value: formatDate(movie.startDate) },
    { label: "Released", value: formatDate(movie.releaseDate) },
  ];

  rows.push(
    { label: "By", value: movie.director },
    // The primary genre leads and the rest follow it, which is the order the sheet holds them in
    // and the order the charts group by.
    { label: "Genre", value: [movie.genre, ...movie.genres].join(" · "), swatch: genreToColour(movie.genre, scheme) },
    { label: "Rating", value: movie.rating, swatch: ageRatingToColour(movie.rating, scheme) },
  );

  // A film with no wider franchise carries its own name in the column, so the row appears only
  // where it names something the film belongs to rather than the film over again.
  // Unknown franchises fall through to an empty colour, which is no swatch rather than a black
  // one — the table names the couple of dozen the app draws, not every series on the sheet.
  if (!namesTheSameThing(movie.franchise, movie.name))
    rows.push({ label: "Franchise", value: movie.franchise, swatch: franchiseToColour(movie, scheme) || undefined });

  return rows;
};

/**
 * A film in a franchise strip's vocabulary: a point — `start === end` — which the strip draws as
 * a dot. One mapper for the tab's own index and the Omnibus union.
 */
export const movieEntry = (movie: Movie, hoverCard: () => ReactNode): FranchiseEntry => ({
  key: movieItemKey(movie),
  subject: movieItemKey(movie),
  franchise: movie.franchise,
  medium: "movie",
  fill: mediumFills.movie,
  label: movie.name,
  start: movie.startDate,
  end: movie.startDate,
  precise: true,
  hoverCard,
});
