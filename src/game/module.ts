import { credits, spanUntil, type MediumModule, type OmniItem } from "../common/medium";
import { gameEntry, gameKey } from "./cardData";
import { gameDataConfig } from "./converter";
import { guestFilter, gameFilters } from "./filters";
import { earliestYear as earliestYearOf } from "../common/statsData";
import { pageState } from "./filterUtils";
import type { Measure, VideoGame } from "./types";

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
    otherGenres: [],
    franchise: game.franchise,
    certificate: game.certificate,
    style: game.style,
    series: game.series,
    seriesNumber: game.seriesNumber,
    credits: credits([
      ["developer", game.developer],
      ["publisher", game.publisher],
    ]),
    venue: game.platform,
    source: game,
  }));

export const gameModule: MediumModule<VideoGame, VideoGame, Measure> = {
  medium: "game",
  tabId: "games",
  noun: "games",
  data: gameDataConfig,
  guestFilter,
  toOmniItems: gameItems,
  entry: gameEntry,
  span: spanUntil,
  artwork: (game) => game.artwork,
  title: (game) => game.name,
  /** A game is already one row per work, so the row itself is the work. */
  work: (game) => game,
  // Every row carries its work's one picture, so a row fronts its work as itself.
  asWork: (item) => item,
  secondaryText: (game) => [game.developer, game.platform, game.series],
  facts: (game, hours) => [game.platform, game.status, hours ? `${hours} hours` : ""].filter(Boolean).join(" · "),
  /** Games first: it is what a row of the sheet is. */
  measures: ["Games", "Hours"],
  // The accessor rather than `statsData`'s own copy of it: a `module.ts` is in the chunk every
  // visit preloads, and importing one line out of that file lands the rest of it there too — 1.15
  // kB gzipped of Top-list categories and date arithmetic on the first paint of every tab.
  earliestYear: (games) => earliestYearOf(games, (game) => game.startDate.year),
  filters: gameFilters,
  pageState,
};
