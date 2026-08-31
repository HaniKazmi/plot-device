import { createFranchiseContext } from "../common/franchiseContext";
import type { Show } from "./types";

/**
 * The raw column, deliberately — not erased where it repeats the show's own name, because a
 * series' first entry often shares it: the show "The Boys" sits in the franchise "The Boys".
 * Whether a franchise is real is a property of the group, not the show — one with a single
 * member is a standalone show naming itself, and every consumer tests the group's size.
 */
export const showFranchise = (show: Show) => show.franchise;

const { FranchiseContext, useFranchiseItems } = createFranchiseContext<Show>();

/** Franchise siblings for the card strip, provided by the tab that already holds the data. */
export { FranchiseContext };

/**
 * The shows sharing this show's franchise, itself included, or the show alone — the answer for a
 * standalone show and for a card rendered with no index above it.
 */
export const useFranchiseShows = (show: Show) => useFranchiseItems(show, showFranchise);
