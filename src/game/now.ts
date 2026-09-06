import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import type { NowModule, NowPanel } from "../common/medium";
import { genreToColour, type Scheme } from "../utils/types";
import { currentlyPlaying, heroStats } from "./statsData";
import type { VideoGame } from "./types";

/** The game in progress, most recently begun — the same election this tab's own hero is made by. */
const elect = (games: VideoGame[]) => currentlyPlaying(games)[0];

const nowPanel = (game: VideoGame, scheme: Scheme): NowPanel => ({
  kicker: `Since ${formatDate(game.startDate)}`,
  date: formatDate(game.startDate),
  title: game.name,
  // The genre alone, like the cards beside it: the composing page draws no gameplay vocabulary, so
  // a game's Now card names the one thing all four media record.
  subtitle: [{ text: game.platform }, { text: game.genre, swatch: genreToColour(game.genre, scheme) }],
  // The franchise tile is dropped by passing the game alone. That page's Franchises section is
  // where it states what a franchise holds, drawn from the filtered union — while the hero is
  // elected from the library and the filters do not narrow it, so a tile here would quote a
  // number that moves under a control the card ignores.
  stats: heroStats(game, [game], CURRENT_PLAINDATE),
});

/**
 * This medium's Now band answers, stated as one typed pair so the election and the panel are
 * checked against the same record here, where `MediumLazy` erases it. Pure, so a test can run the
 * pair as the band runs it, without the card tree `module.lazy.ts` also carries.
 */
export const now: NowModule<VideoGame> = { elect, nowPanel };
