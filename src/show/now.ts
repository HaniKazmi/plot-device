import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import type { NowModule, NowPanel } from "../common/medium";
import type { Scheme } from "../utils/types";
import { showSubtitle } from "./cardData";
import { currentlyWatching, heroSeason, showHeroStats } from "./statsData";
import type { Season, Show } from "./types";

/**
 * The season the sheet's Last Watched column marks as current, which is the tab's own hero: several
 * shows are always in flight, so the election is the sheet's answer rather than a date's.
 */
const elect = (shows: Show[]) => heroSeason(currentlyWatching(shows));

const nowPanel = (season: Season, scheme: Scheme): NowPanel => ({
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

/**
 * This medium's Now band answers, stated as one typed pair so the election and the panel are
 * checked against the same record here, where `MediumLazy` erases it. Pure, so a test can run the
 * pair as the band runs it, without the card tree `module.lazy.ts` also carries.
 */
export const now: NowModule<Show, Season> = { elect, nowPanel };
