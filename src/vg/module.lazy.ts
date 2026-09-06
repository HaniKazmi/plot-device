import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import type { NowPanel } from "../common/medium";
import { genreToColour, type Scheme } from "../utils/types";
import { currentlyPlaying, heroStats } from "./statsData";
import type { VideoGame } from "./types";

/**
 * The Games card, hover card and Now band answers, behind the chunk that draws them.
 *
 * A registry keyed by medium is reachable from the shell, so anything named in `module.ts` lands
 * in the first bundle a visitor downloads. Cards and hover cards are deliberately not there, and
 * this file is where they stay out of it. The election and the panel below are here for the same
 * reason and one more: what they answer is a card — the one the composing tab's Now band leads
 * with — stated in this tab's own words rather than in a fifth vocabulary.
 *
 * These four and nothing else. The lookup over the four is dynamic (`MEDIA_LAZY[item.medium]`), so
 * a bundler keeps every export this file has in the chunk that lookup pulls in — which the union
 * prefetches on every visit for its hover cards. A fifth export here is weight on that chunk
 * whether or not a card is ever opened.
 */
export { default as CardMediaImage, VgHoverCard as HoverCard } from "./CardMediaImage";

/** The game in progress, most recently begun — the same election this tab's own hero is made by. */
export const elect = (games: VideoGame[]) => currentlyPlaying(games)[0];

export const nowPanel = (game: VideoGame, scheme: Scheme): NowPanel => ({
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
