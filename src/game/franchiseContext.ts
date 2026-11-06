import { useFranchiseUnion } from "../common/franchiseUnion";
import { createFranchiseContext } from "../common/franchiseContext";
import type { VideoGame } from "./types";

/**
 * The raw column, deliberately — not erased where it repeats the game's own name, because a
 * series' first entry often shares it: "Zelda" sits in the Zelda franchise. Whether a franchise
 * is real is a property of the group, not the game — one with a single member is a standalone
 * game naming itself, and every consumer tests the group's size.
 */
export const gameFranchise = (game: VideoGame) => game.franchise;

const { FranchiseContext, useFranchiseItems } = createFranchiseContext<VideoGame>();

/** Franchise siblings for the card strip, provided by the tab that already holds the data. */
export { FranchiseContext };

/**
 * The games sharing this game's franchise, itself included, or the game alone — which is the
 * answer for an unaffiliated game and for a card rendered with no index above it.
 */
export const useFranchiseGames = (game: VideoGame) => useFranchiseItems(game, gameFranchise);

/**
 * What this game's franchise strip draws from — the union across the four media once they are all
 * here, and this tab's own index until then — or nothing, for a game alone in its franchise.
 *
 * One answer for the strip and for a caller that lays the strip out, so the hero asks the question
 * the strip itself answers rather than finding out from the page whether anything was drawn.
 */
export const useGameStripSource = (game: VideoGame) => {
  const union = useFranchiseUnion(game.franchise);
  const own = useFranchiseGames(game);
  return (union ?? own).length > 1 ? { union, own } : undefined;
};
