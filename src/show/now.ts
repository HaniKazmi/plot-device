import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import type { NowModule, NowPanel } from "../common/medium";
import type { Scheme } from "../utils/types";
import { showSubtitle } from "./cardData";
import { heroSeason, showHeroStats } from "./statsData";
import type { Season, Show } from "./types";

const nowPanel = (season: Season, scheme: Scheme): NowPanel => ({
  // `heroSeason` elects on that date, so the season carries one.
  kicker: formatDate(season.lastWatchedDate!),
  date: formatDate(season.lastWatchedDate!),
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
 *
 * The election is the tab's own, so the card cannot state a rule the Shows page does not. It is
 * not always the same season: the band reads the whole library where the tab reads the page's own
 * rows, as every medium's card does, so a filter set on Shows moves that page's hero and leaves
 * this card where it was. Every season the sheet dates is a candidate, so Shows contributes a card
 * to almost any library — the band's "nothing to name, no card" is a rule Movies already answers
 * the same way, a film being finished the day it is started.
 */
export const now: NowModule<Show, Season> = { elect: heroSeason, nowPanel };
