import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import type { NowPanel } from "../common/medium";
import type { Scheme } from "../utils/types";
import { showSubtitle } from "./cardData";
import { currentlyWatching, heroSeason, showHeroStats } from "./statsData";
import type { Season, Show } from "./types";

/** The Shows card, hover card and Now band answers, behind the chunk that draws them. See `vg/module.lazy.ts`. */
export { default as CardMediaImage, ShowHoverCard as HoverCard } from "./CardMediaImage";

/**
 * The season the sheet's Last Watched column marks as current, which is the tab's own hero: several
 * shows are always in flight, so the election is the sheet's answer rather than a date's.
 */
export const elect = (shows: Show[]) => heroSeason(currentlyWatching(shows));

export const nowPanel = (season: Season, scheme: Scheme): NowPanel => ({
  // `heroSeason` elects among the seasons carrying a last-watched date, so the show has one.
  kicker: formatDate(season.show.lastWatchedDate!),
  date: formatDate(season.show.lastWatchedDate!),
  // The episode in hand, which the row has no title to carry: the poster names the show and cannot
  // say which season, let alone how far into it.
  title: `${season.show.name} S${season.s}`,
  subtitle: showSubtitle(season.show, scheme),
  // The rate tile stays on the Shows tab's own hero; beside a poster this card's text column holds
  // two figures comfortably and three crowd it.
  stats: showHeroStats(season, 1, CURRENT_PLAINDATE, { pace: false }),
});
