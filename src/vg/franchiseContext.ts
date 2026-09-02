import { createFranchiseContext } from "../common/franchiseContext";
import type { VideoGame } from "./types";

/**
 * The raw column, deliberately — not erased where it repeats the game's own name, because a
 * series' first entry often shares it: "Zelda" sits in the Zelda franchise. Whether a franchise
 * is real is a property of the group, not the game — one with a single member is a standalone
 * game naming itself, and every consumer tests the group's size.
 */
export const vgFranchise = (game: VideoGame) => game.franchise;

const { FranchiseContext, useFranchiseItems } = createFranchiseContext<VideoGame>();

/** Franchise siblings for the card strip, provided by the tab that already holds the data. */
export { FranchiseContext };

/**
 * The games sharing this game's franchise, itself included, or the game alone — which is the
 * answer for an unaffiliated game and for a card rendered with no index above it.
 */
export const useFranchiseGames = (game: VideoGame) => useFranchiseItems(game, vgFranchise);
