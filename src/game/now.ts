import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import type { NowModule, NowPanel } from "../common/medium";
import { genreToColour, type Scheme } from "../utils/types";
import { currentlyPlaying, heroStats } from "./statsData";
import { platformToColor, type VideoGame } from "./types";

/** The game in progress, most recently begun — the same election this tab's own hero is made by. */
const elect = (games: VideoGame[]) => currentlyPlaying(games)[0];

const nowPanel = (game: VideoGame, scheme: Scheme): NowPanel => ({
  kicker: `Since ${formatDate(game.startDate)}`,
  date: formatDate(game.startDate),
  title: game.name,
  // Where it is played and the genre, each in the fill its tab paints it, as the Shows card beside
  // it names its network: the composing page draws no gameplay vocabulary, so a game's Now card
  // leaves out the one the Games tab alone records.
  subtitle: [
    { text: game.platform, swatch: platformToColor(game, scheme) },
    { text: game.genre, swatch: genreToColour(game.genre, scheme) },
  ],
  stats: heroStats(game, CURRENT_PLAINDATE),
});

/**
 * This medium's Now band answers, stated as one typed pair so the election and the panel are
 * checked against the same record here, where `MediumLazy` erases it. Pure, so a test can run the
 * pair as the band runs it, without the card tree `module.lazy.ts` also carries.
 */
export const now: NowModule<VideoGame> = { elect, nowPanel };
