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
