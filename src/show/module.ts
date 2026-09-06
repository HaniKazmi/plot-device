import type { MediumModule, OmniItem } from "../common/medium";
import { seasonEntry, seasonKey, seasonSpan } from "./cardData";
import { showDataConfig } from "./converter";
import { guestFilter, showFilters } from "./filters";
import { pageState } from "./filterUtils";
import { earliestYear as earliestYearOf } from "../common/statsData";
import type { Measure, Season, Show } from "./types";

/**
 * A season as one row of the union — the unit a show contributes, not the show.
 *
 * A show runs for years and a season is the thing that was actually watched in one of them, which
 * is what makes it comparable to a game beaten, a film seen or a book read. The season carries its
 * show's name, genre, franchise and certificate, those being facts about the show rather than
 * about the season.
 */
const seasonItems = (shows: Show[]): OmniItem[] =>
  shows.flatMap((show) =>
    show.s.map((season): OmniItem => ({
      medium: "show",
      // The show's name and the season number, which is what the tab keys a season by: every
      // season of a show carries its show's name and only the number separates them.
      key: seasonKey(season),
      name: show.name,
      closeDate: season.endDate,
      year: (season.endDate ?? season.startDate).year,
      hours: season.minutes / 60,
      genre: show.genre,
      genres: show.genres,
      franchise: show.franchise,
      certificate: show.certificate,
      source: season,
    })),
  );

export const showModule: MediumModule<Show, Season, Measure> = {
  medium: "show",
  tabId: "show",
  noun: "shows",
  data: showDataConfig,
  guestFilter,
  toOmniItems: seasonItems,
  entry: seasonEntry,
  span: seasonSpan,
  // The sheets hold one banner per show, so a season is drawn as its show.
  artwork: (season) => season.show.artwork,
  // A strip of six cards all reading the same show name says nothing about what was watched.
  title: (season) => `${season.show.name} S${season.s}`,
  // The show itself, which is exact: every season of one show holds the same object. A wall draws
  // one banner per show, where keying on the season would stand a six-season show on a shelf as
  // six copies of the same artwork and crowd every other show off the strip.
  work: (season) => season.show,
  secondaryText: (season) => [season.show.network, ...season.show.s.map((each) => each.subtitle ?? "")],
  // Seasons rather than hours: how long a show ran is what a reader recognises it by, and the
  // hours a hit is told with are every season's together rather than this one's.
  facts: (season) =>
    [
      season.show.s.length === 1 ? "1 season" : `${season.show.s.length} seasons`,
      season.show.status,
      season.show.network,
    ]
      .filter(Boolean)
      .join(" · "),
  /**
   * Shows is absent: the tab's own figures are counted in seasons, which is the thing actually
   * watched in a year.
   */
  measures: ["Seasons", "Episodes", "Hours"],
  // The accessor and not `statsData`'s own copy of it — see `game/module.ts` for what the shared
  // one costs the chunk every visit preloads.
  earliestYear: (shows) => earliestYearOf(shows, (show) => show.startDate.year),
  filters: showFilters,
  pageState,
};
