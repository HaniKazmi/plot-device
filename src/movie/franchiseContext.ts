import { useFranchiseUnion } from "../common/franchiseUnion";
import { createFranchiseContext } from "../common/franchiseContext";
import type { Movie } from "./types";

/**
 * The raw column, deliberately — not erased where it repeats the film's own name, because the
 * first film of a series usually shares it: "Dune" sits in the Dune franchise, "Alien" in Alien.
 * Whether a franchise is real is a property of the group, not the film — one with a single
 * member is a standalone film naming itself, and every consumer tests the group's size.
 */
export const movieFranchise = (movie: Movie) => movie.franchise;

const { FranchiseContext, useFranchiseItems } = createFranchiseContext<Movie>();

/** Franchise siblings for the card strip, provided by the tab that already holds the data. */
export { FranchiseContext };

/**
 * The films sharing this film's franchise, itself included, or the film alone — the answer for a
 * standalone film and for a card rendered with no index above it.
 */
export const useFranchiseMovies = (movie: Movie) => useFranchiseItems(movie, movieFranchise);

/**
 * What this film's franchise strip draws from — the union across the four media once they are all
 * here, and this tab's own index until then — or nothing, for a film alone in its franchise.
 *
 * One answer for the strip and for a caller that lays the strip out, so the hero asks the question
 * the strip itself answers rather than finding out from the page whether anything was drawn.
 */
export const useMovieStripSource = (movie: Movie) => {
  const union = useFranchiseUnion(movie.franchise);
  const own = useFranchiseMovies(movie);
  return (union ?? own).length > 1 ? { union, own } : undefined;
};
