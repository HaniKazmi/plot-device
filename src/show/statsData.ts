import { formatDate, type YearMonthDay, type YearNumber } from "../common/date";
import { sheetError } from "../common/sheetError";
import { format } from "../utils/mathUtils";
import { typeToName, type Measure, type Season, type Show } from "./types";
import { groupByCategory, realFranchisesOnly } from "../common/statsData";
import "../utils/arrayUtils";

/**
 * The categories the Top list offers, in the order its select box shows them.
 *
 * The order is load-bearing beyond presentation: `TopList` turns a category's index into a
 * Highcharts palette offset, so reordering this recolours those charts.
 */
export const showTopOptions = ["genre", "network", "franchise", "type", "status", "rating"] as const;

export type ShowTopOption = (typeof showTopOptions)[number];

/**
 * A grouping's value for one show, worded the way a card should read it — the type column is
 * lower case and answers through `typeToName`.
 */
const showGroupValue = (show: Show, key: ShowTopOption): string => {
  if (key === "type") return typeToName(show.type);
  return show[key];
};

const measureOf = (shows: Show[], measure: Measure) => {
  if (measure === "Hours") return Math.floor(shows.sum("minutes") / 60);
  if (measure === "Episodes") return shows.sum("e");
  return shows.length;
};

/**
 * Groups shows by a category, ordered most-watched first. Shows rather than seasons, so a
 * drill-down opens on show cards and the counts read in the units the rest of the tab uses.
 * The artwork scan is a reduce rather than a sort: only the most-watched show is wanted.
 */
export const groupShowsBy = (data: Show[], key: ShowTopOption, measure: Measure) =>
  groupByCategory(
    data,
    (show) => showGroupValue(show, key),
    (shows) => measureOf(shows, measure),
    (shows) => shows.reduce((best, show) => (show.minutes > best.minutes ? show : best)),
    key === "franchise" ? realFranchisesOnly : undefined,
  );

/**
 * The honest progress figures for a season being watched: pace, never a fraction. The sheet
 * records episodes *watched* and knows nothing about how many have aired, so a "6 of 10" would
 * be a number the data does not contain.
 *
 * `today` is a parameter rather than read from the clock, so the figures are a function of the
 * data alone. Each figure is dropped where the sheet cannot support it: no runtime means no
 * hours, a start after `today` means no day count (`daysTo` throws backwards), and a pace over
 * less than a week is a projection rather than a rate.
 */
export const watchingProgress = (season: Season, today: YearMonthDay) => {
  const days = season.startDate.lte(today) ? season.startDate.daysTo(today) : undefined;
  return {
    episodes: season.e,
    hours: season.minutes ? Math.floor(season.minutes / 60) : undefined,
    days,
    perWeek: days !== undefined && days >= 7 ? Math.round((season.e / (days / 7)) * 10) / 10 : undefined,
  };
};

export const allTimeTotals = (data: Show[]) => ({
  shows: data.length,
  episodes: data.sum("e"),
  hours: Math.floor(data.sum("minutes") / 60),
});

/**
 * Totals for the seasons that started in `year`. The year is a parameter rather than read from
 * the clock, so the numbers are a function of the data alone.
 */
export const seasonsInYear = (data: Show[], year: YearNumber) => {
  const filtered = data.flatMap((show) => show.s).filter((s) => s.startDate.year === year);
  return {
    seasons: filtered.length,
    episodes: filtered.sum("e"),
    hours: Math.floor(filtered.sum("minutes") / 60),
  };
};

/**
 * Seasons, episodes and hours per year, averaged over the years that have any watched season.
 * Seasons with no recorded runtime are skipped entirely, so a year of untimed viewing does not
 * appear at all rather than dragging the average down.
 */
export const yearlyAverages = (data: Show[]) => {
  const grouped = data
    .flatMap((show) => show.s)
    .reduce(
      (tree, s) => {
        if (!s.minutes) return tree;
        const year = s.startDate.year;
        // Written out rather than `??=` because the React Compiler cannot lower that operator yet.
        tree[year] = tree[year] ?? { seasons: 0, episodes: 0, minutes: 0 };
        tree[year].seasons += 1;
        tree[year].episodes += s.e;
        tree[year].minutes += s.minutes;
        return tree;
      },
      {} as Record<YearNumber, { seasons: number; episodes: number; minutes: number }>,
    );

  const totals = Object.values(grouped);
  return {
    seasons: Math.floor(totals.sum("seasons") / totals.length),
    episodes: Math.floor(totals.sum("episodes") / totals.length),
    // Minutes are averaged first and converted second, so this is the floor of the average
    // hours rather than the average of per-year floored hours.
    hours: Math.floor(totals.sum("minutes") / totals.length / 60),
  };
};

/** Seasons, episodes and hours divided across every show, including shows with no seasons. */
export const perShowAverages = (data: Show[]) => {
  const filtered = data.flatMap((show) => show.s);
  return {
    seasons: Math.round(filtered.length / data.length),
    episodes: Math.round(filtered.sum("e") / data.length),
    hours: Math.floor(filtered.sum("minutes") / 60 / data.length),
  };
};

/**
 * Minutes per episode over everything watched — the one place `episodeLength` reaches a figure.
 * Derived from total minutes over total episodes rather than averaging the per-season lengths,
 * so a twenty-episode season counts twenty times and a two-episode one twice.
 */
export const minutesPerEpisode = (data: Show[]) => {
  const seasons = data.flatMap((show) => show.s);
  const episodes = seasons.sum("e");
  return episodes ? Math.round(seasons.sum("minutes") / episodes) : 0;
};

/**
 * The season the hero leads with: among everything being watched, the one whose show the sheet's
 * Last Watched column marks as most recent. Answers nothing when no watching show carries the
 * column — the sheet predates it, or nothing is marked yet — and the page then falls back to the
 * plain strip rather than promoting a show by a tie-break the data does not hold.
 */
export const heroSeason = (watching: Season[]) =>
  watching
    .filter((season) => season.show.lastWatchedDate)
    .reduce<Season | undefined>(
      (best, season) => (!best || best.show.lastWatchedDate!.lte(season.show.lastWatchedDate!) ? season : best),
      undefined,
    );

/**
 * The figures the hero carries about the season it is showing — the same honest set the strip's
 * footers use, at tile size. Each is dropped where the sheet cannot support it, and the
 * franchise tile appears only where there is a series to count.
 */
export const showHeroStats = (season: Season, franchiseCount: number, today: YearMonthDay) => {
  const { episodes, days, perWeek } = watchingProgress(season, today);
  const stats: { label: string; value: number | string }[] = [{ label: "Episodes", value: episodes }];

  if (days !== undefined) stats.push({ label: "Days In", value: days });
  if (perWeek !== undefined) stats.push({ label: "Eps / Week", value: perWeek });
  if (franchiseCount > 1) stats.push({ label: `${season.show.franchise} Shows`, value: franchiseCount });

  return stats;
};

/** Two footer rows: when the watch started and how long it has run, then how much and how fast. */
export const statsCardLabelWatching = (season: Season, today: YearMonthDay) => {
  const { episodes, days, perWeek } = watchingProgress(season, today);
  return [
    [formatDate(season.startDate), days !== undefined ? `${format(days)} days in` : ""],
    [`${episodes} eps`, perWeek !== undefined ? `${perWeek}/wk` : ""],
  ];
};

/** Every finished season, newest first. How many of them fit is the card's decision. */
export const recentlyComplete = (data: Show[]) =>
  data
    .flatMap((show) => show.s)
    .filter((season) => season.endDate)
    .sortByKey("endDate");

/**
 * The in-progress season of every show still being watched.
 *
 * A show marked Watching with no seasons is a spreadsheet error rather than something to
 * render around, so it throws — but says which show, since the alternative is a bare
 * "cannot read properties of undefined" from somewhere in the card grid.
 */
export const currentlyWatching = (data: Show[]) =>
  data
    .filter((show) => show.status === "Watching")
    .map((show) => show.s.at(-1) ?? sheetError(`Show "${show.name}"`, "is marked Watching but has no seasons"))
    .filter((season) => !season.endDate)
    .sortByKey("startDate");

// Dates are in the reader's voice and not the machine's, which is the same one the card behind
// the thumbnail speaks.
export const statsCardLabelRecentlyComplete = (season: Season) => [
  [`S${season.s}`, season.endDate ? formatDate(season.endDate) : ""],
  [`${season.e} Eps`, `${format(Math.round(season.minutes / 60))} Hours`],
];

export const statsCardLabelCurrentlyPlaying = (season: Season) => [
  [`S${season.s}`, season.startDate ? formatDate(season.startDate) : ""],
];
