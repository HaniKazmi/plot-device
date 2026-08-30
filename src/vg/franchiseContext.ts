import { createFranchiseContext } from "../common/franchiseContext";
import type { VideoGame } from "./types";

const { FranchiseContext, useFranchiseItems } = createFranchiseContext<VideoGame>();

/** Franchise siblings for the card strip, provided by the tab that already holds the data. */
export { FranchiseContext };

/**
 * The games sharing this game's franchise, itself included, or the game alone — which is the
 * answer for an unaffiliated game and for a card rendered with no index above it.
 */
export const useFranchiseGames = (game: VideoGame) => useFranchiseItems(game, (vg) => vg.franchise);
