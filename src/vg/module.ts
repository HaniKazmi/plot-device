import type { MediumModule, OmniItem } from "../common/medium";
import { gameEntry, gameKey, gameSpan } from "./cardData";
import { vgDataConfig } from "./converter";
import { guestFilter, vgFilters } from "./filters";
import { pageState } from "./filterUtils";
import { vgFranchise } from "./franchiseContext";
import type { Measure, VideoGame } from "./types";

/** The units the tab counts in, in the rail. Games first: it is what a row of the sheet is. */
export const MEASURES: readonly Measure[] = ["Games", "Hours"];

/**
 * A game as one row of the union. `hours` falls to zero for a game the sheet records none for,
 * where every other medium's figure is derived from something the sheet always holds.
 */
const gameItems = (games: VideoGame[]): OmniItem[] =>
  games.map((game): OmniItem => ({
    medium: "game",
    // The tuple the tab already keys a span by: a title on its own repeats across the platforms
    // a game was played on and across a replay of it.
    key: gameKey(game),
    name: game.name,
    closeDate: game.endDate,
    year: (game.endDate ?? game.startDate).year,
    hours: game.hours ?? 0,
    genre: game.genre,
    genres: [],
    franchise: game.franchise,
    rating: game.rating,
    source: game,
  }));

export const vgModule: MediumModule<VideoGame> = {
  medium: "game",
  tabId: "vg",
  noun: "games",
  data: vgDataConfig,
  guestFilter,
  franchiseOf: vgFranchise,
  toOmniItems: gameItems,
  entry: gameEntry,
  span: gameSpan,
  banner: (game) => game.banner,
  title: (game) => game.name,
  /** A game is already one row per work, so the row itself is the work. */
  work: (game) => game,
  secondaryText: (game) => [game.developer, game.platform],
  facts: (game, hours) => [game.platform, game.status, hours ? `${hours} hours` : ""].filter(Boolean).join(" · "),
  measures: MEASURES,
  filters: vgFilters,
  pageState,
  load: () => import("./module.lazy"),
};
