import { createContext, useContext } from "react";
import type { VideoGame } from "./types";

/**
 * Franchise siblings for the card strip.
 *
 * A `VideoGame` names its franchise but carries no pointer to the rest of it, and `common/` is
 * not allowed to reach into a domain for the full list, so the index is threaded down from the
 * tab that already holds the data.
 */
export const FranchiseContext = createContext<Map<string, VideoGame[]> | undefined>(undefined);

/**
 * The games sharing this game's franchise, itself included, or the game alone — which is the
 * answer for an unaffiliated game and for a card rendered with no index above it.
 */
export const useFranchiseGames = (game: VideoGame) => {
  const index = useContext(FranchiseContext);
  return (game.franchise ? index?.get(game.franchise) : undefined) ?? [game];
};
