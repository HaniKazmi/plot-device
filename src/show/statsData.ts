import { daysSince, formatDate, type YearMonthDay, type YearNumber } from "../common/date";
import { sheetError } from "../common/sheetError";
import { format } from "../utils/mathUtils";
import { typeToName, type Measure, type Season, type Show } from "./types";
import { earliestYear as earliestYearOf, groupByCategory, realFranchisesOnly } from "../common/statsData";
import "../utils/arrayUtils";

/**
 * The library's own first year, so the rail's year picker offers a floor the data actually
 * reaches. A constant one year after the converter's own trust cutoff would answer the same thing
 * only as long as the earliest surviving season happens to sit right on that cutoff; read from the
 * data instead, the floor still tracks the actual earliest season if that cutoff or the sheet's
 * own oldest row ever moves.
 */
export const earliestYear = (data: readonly Show[]): YearNumber => earliestYearOf(data, (show) => show.startDate.year);

/**
 * The categories the Top list offers, in the order its select box shows them.
 *
 * The order is load-bearing beyond presentation: `TopList` turns a category's index into a
 * Highcharts palette offset, so reordering this recolours those charts.
 */
export const showTopOptions = ["genre", "network", "franchise", "type", "status", "certificate"] as const;

export type ShowTopOption = (typeof showTopOptions)[number];

/**
 * A grouping's value for one show, worded the way a card should read it — the type column is
 * lower case and answers through `typeToName`.
 */
const showGroupValue = (show: Show, key: ShowTopOption): string => {
  if (key === "type") return typeToName(show.type);
  return show[key];
};

/** Minutes as whole hours — the one floor every hours figure on this tab shares. */
export const seasonHours = (minutes: number) => Math.floor(minutes / 60);

/** How much a set of shows counts for under the active measure — the one home of the /60 floor. */
export const measureOf = (shows: Show[], measure: Measure) => {
  if (measure === "Hours") return seasonHours(shows.sum("minutes"));
  if (measure === "Episodes") return shows.sum("e");
  // The seasons on record, not the numbering: the converter drops pre-2006 seasons, so a show
  // whose watched seasons are S5–S8 counts four.
  if (measure === "Seasons") return shows.flatMap((show) => show.s).length;
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
 * How long a season has been, or was, in hand — measured to its own end once it has one. Left
 * running to today, a finished season's day count climbs and its pace falls for as long as the row
 * is in the library.
 *
 * `daysSince` is what guards the comparison, and the guard is load-bearing here: a season whose
 * start is after its end is only a `console.error` in the converter and survives into the model,
 * where a bare `daysTo` throws from inside a render.
 */
const daysWatching = (season: Season, today: YearMonthDay) => daysSince(season.startDate, season.endDate ?? today);

/**
 * The honest progress figures for a season: pace, never a fraction. The sheet records episodes
 * *watched* and knows nothing about how many have aired, so a "6 of 10" would be a number the
 * data does not contain.
 *
 * `today` is a parameter rather than read from the clock, so the figures are a function of the
 * data alone — and it is only reached for a season still running, `daysWatching` measuring a
 * finished one to its own end. Each figure is dropped where the sheet cannot support it: no
 * runtime means no hours, a span the sheet typed backwards means no day count, and a pace is
 * stated only past a week, where a shorter run is too little of either kind of span to rate — a
 * projection while a season is open, and a handful of days that averages to a wild figure once it
 * has closed.
 */
export const watchingProgress = (season: Season, today: YearMonthDay) => {
  const days = daysWatching(season, today);
  return {
    episodes: season.e,
    hours: season.minutes ? seasonHours(season.minutes) : undefined,
    days,
    perWeek: days !== undefined && days >= 7 ? Math.round((season.e / (days / 7)) * 10) / 10 : undefined,
  };
};

export const allTimeTotals = (data: Show[]) => ({
  shows: data.length,
  episodes: data.sum("e"),
  hours: seasonHours(data.sum("minutes")),
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
 * Newest watch first, and a season the sheet dates neither way last — a season with no date behind
 * it is not what a reader is in the middle of. A full tie compares equal, so the order the sheet
 * lists its rows in survives one.
 *
 * Two watched the same day are separated by the finished one leading: finishing something is the
 * more notable of two watches made on one day, and day precision is all the sheet records, so
 * ties are as common as watching two shows in an evening.
 */
const byLastWatched = (a: Season, b: Season) => {
  const aDate = a.lastWatchedDate;
  const bDate = b.lastWatchedDate;
  if (!aDate || !bDate) return aDate ? -1 : bDate ? 1 : 0;
  if (aDate > bDate) return -1;
  if (bDate > aDate) return 1;
  if (!!a.endDate === !!b.endDate) return 0;
  return a.endDate ? -1 : 1;
};

/**
 * The season of a list holding the newest watch, and nothing where the sheet dates none of them.
 *
 * A reduce rather than a sort: only the one season is wanted. Strictly `< 0`, so a full tie keeps
 * the season the sheet lists first, which is the answer the strip's own stable sort gives. The
 * closing test is what keeps the undated rule in one place: `byLastWatched` sorts an undated
 * season last, so the winner is dated whenever anything is, and no caller has to know that.
 */
const newestWatched = (seasons: Season[]) => {
  const best = seasons.reduce<Season | undefined>(
    (best, season) => (!best || byLastWatched(season, best) < 0 ? season : best),
    undefined,
  );

  return best?.lastWatchedDate ? best : undefined;
};

/**
 * The season holding the last episode watched, which is the page's hero. Every season in the
 * library is a candidate whatever its show's status — Ended, Cancelled and Abandoned alike: a
 * status says what the reader has decided about a show's future, where the hero states what they
 * last watched, so pinning the election to what is still in flight puts the finale watched
 * yesterday out of reach of the one surface meant to name it. The card carries no status chip, so
 * a show given up on leads exactly as one still running does.
 *
 * Answers nothing where the sheet dates no season at all — the column predates the rows and
 * nothing has finished — and the page then falls back to the plain strip rather than promoting a
 * season by a tie-break the data does not hold.
 */
export const heroSeason = (data: Show[]) => newestWatched(data.flatMap((show) => show.s));

/**
 * The one season of a show holding its last watched episode, read by the order the hero is elected
 * in, so a card's own ledger and the hero above it cannot name two different seasons of one show.
 *
 * Falls back to the last season listed where the sheet dates none of them: a ledger row has to say
 * something, and the newest row is the best guess left once no date is.
 */
export const lastWatchedSeason = (show: Show) => newestWatched(show.s) ?? show.s.at(-1)!;

/** Which of the optional figures a caller has room for. */
interface ShowHeroStatOptions {
  /** The episodes-per-week tile. */
  pace?: boolean;
}

/**
 * The figures the hero carries about the season it is showing — the same honest set the strip's
 * footers use, at tile size. Each is dropped where the sheet cannot support it, and the
 * franchise tile appears only where there is a series to count.
 *
 * `pace` is what a caller with less room to spend turns off — the Omnibus's Now band, where the
 * card's words sit in a column beside a poster and hold two figures comfortably. Asked for by
 * name rather than filtered out of the result afterwards, so rewording a label cannot quietly put
 * the tile back.
 */
export const showHeroStats = (
  season: Season,
  franchiseCount: number,
  today: YearMonthDay,
  options?: ShowHeroStatOptions,
) => {
  const { episodes, days, perWeek } = watchingProgress(season, today);
  const stats: { label: string; value: number | string }[] = [{ label: "Episodes", value: episodes }];

  // "In" only while the season is: on one that has ended the figure is a span the sheet closed.
  if (days !== undefined) stats.push({ label: season.endDate ? "Days" : "Days In", value: days });
  if (perWeek !== undefined && (options?.pace ?? true)) stats.push({ label: "Eps / Week", value: perWeek });
  if (franchiseCount > 1) stats.push({ label: `${season.show.franchise} Shows`, value: franchiseCount });

  return stats;
};

/** Two footer rows: when the watch started and how long it has run, then how much and how fast. */
export const statsCardLabelWatching = (season: Season, today: YearMonthDay) => {
  const { episodes, days, perWeek } = watchingProgress(season, today);
  return [
    [formatDate(season.startDate), days !== undefined ? `${format(days)} days${season.endDate ? "" : " in"}` : ""],
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
 * The latest season of every show still being watched, most recently watched first, and the
 * seasons the sheet cannot date after them in the order it lists their shows.
 *
 * A season that has ended is kept: the Status cell marks a show whose next season is still to
 * come, and dropping it takes a show the reader is midway through a series of off the one strip
 * that answers what is in flight.
 *
 * A show marked Watching with no seasons is a spreadsheet error rather than something to
 * render around, so it throws — but says which show, since the alternative is a bare
 * "cannot read properties of undefined" from somewhere in the card grid.
 */
export const currentlyWatching = (data: Show[]) =>
  data
    .filter((show) => show.status === "Watching")
    .map((show) => show.s.at(-1) ?? sheetError(`Show "${show.name}"`, "is marked Watching but has no seasons"))
    .toSorted(byLastWatched);

// Dates are in the reader's voice and not the machine's, which is the same one the card behind
// the thumbnail speaks.
export const statsCardLabelRecentlyComplete = (season: Season) => [
  [`S${season.s}`, season.endDate ? formatDate(season.endDate) : ""],
  [`${season.e} Eps`, `${format(seasonHours(season.minutes))} Hours`],
];

/** The Eps/Hours line the most-watched lists print for a whole show. */
export const statsCardLabelEpsHours = (show: Show) => [
  [`${format(show.e)} Eps`, `${format(seasonHours(show.minutes))} Hours`],
];
