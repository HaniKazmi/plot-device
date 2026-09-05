import type { Movie } from "./types";

/** The Movies half a browse surface reaches for. See `vg/module.lazy.ts`. */
export { default as CardMediaImage, MovieHoverCard as HoverCard } from "./CardMediaImage";

/**
 * Title and release, so a rewatch joins the first viewing while a remake of the same name stays a
 * work of its own.
 */
export const work = (movie: Movie): unknown => `${movie.name}-${movie.releaseDate}`;

export const secondaryText = (movie: Movie) => [movie.director];

export const facts = (movie: Movie) =>
  [movie.cinema ? "Cinema" : "Home", movie.score === undefined ? "" : `${movie.score}/10`, movie.director]
    .filter(Boolean)
    .join(" · ");
