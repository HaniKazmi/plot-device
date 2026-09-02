import { CURRENT_YEAR, formatDate, type YearMonthDay, type YearNumber } from "../common/date";
import { format } from "../utils/mathUtils";
import { groupByCategory } from "../common/statsData";
import { platformToShort, type Measure, type VideoGame, type VideoGameStringKeys } from "./types";
import "../utils/arrayUtils";

/**
 * The categories the Top list offers, in the order its select box shows them.
 *
 * The order is load-bearing beyond presentation: `TopList` turns a category's index into a
 * Highcharts palette offset, so reordering this recolours those charts. It lives here rather
 * than being derived from the icon map so that the ordering is a plain value.
 */
export const topOptions = [
  "company",
  "format",
  "franchise",
  "platform",
  "developer",
  "publisher",
  "rating",
  "status",
  "gameplay",
  "genre",
] as const satisfies Exclude<VideoGameStringKeys, "name">[];

export type TopOption = (typeof topOptions)[number];

/**
 * Groups completed, time-tracked games by a category, ordered most-played first. The artwork
 * scan is a reduce rather than a sort: only the longest-played game is wanted.
 */
export const groupGamesBy = (data: VideoGame[], key: VideoGameStringKeys, measure: Measure) =>
  groupByCategory(
    data.filter((game) => game.hours && game.endDate),
    (game) => game[key],
    (games) => (measure === "Hours" ? games.sum("hours") : games.length),
    (games) => games.reduce((best, game) => (game.hours! > best.hours! ? game : best)),
  );

/**
 * The first year the library holds a game in, which is the floor the year select offers. There is
 * no fixed epoch for Games the way Movies has a tracking start date — the sheet's own oldest
 * release is whatever it is — so the floor is read from the data rather than a constant. Falls
 * back to the current year when the library is empty, since the select then has nothing below it
 * to offer anyway.
 */
export const earliestYear = (data: VideoGame[]): YearNumber =>
  data.reduce<YearNumber | undefined>(
    (earliest, game) => (!earliest || game.startDate.year < earliest ? game.startDate.year : earliest),
    undefined,
  ) ?? CURRENT_YEAR;

/** Count and hours over the time-tracked games — what both year cards total, scoped by the caller. */
export const gamesAndHours = (data: VideoGame[]) => {
  const timed = data.filter((game) => game.hours);
  return { games: timed.length, hours: timed.sum("hours") };
};

/**
 * Games and hours per year, averaged over the years that have any time-tracked game. Years with
 * nothing logged are absent rather than counted as zero, so the average is over active years.
 */
export const yearlyAverages = (data: VideoGame[]) => {
  const grouped = data.reduce<Record<YearNumber, { games: number; hours: number }>>((tree, game) => {
    if (!game.hours) return tree;
    // Written out rather than `??=` because the React Compiler cannot lower that operator yet.
    const gamesAndHours = tree[game.startDate.year] ?? { games: 0, hours: 0 };
    tree[game.startDate.year] = gamesAndHours;
    gamesAndHours.games += 1;
    gamesAndHours.hours += game.hours;
    return tree;
  }, {});

  const totals = Object.values(grouped);
  return {
    games: parseFloat((totals.sum("games") / totals.length).toFixed(2)),
    hours: parseFloat((totals.sum("hours") / totals.length).toFixed(2)),
  };
};

/**
 * Every game still being played, most recently started first — so the first entry is the one a
 * page leading with a single game should lead with.
 */
export const currentlyPlaying = (data: VideoGame[]) =>
  data.filter((game) => game.status === "Playing").sortByKey("startDate");

/**
 * The figures the hero carries about the game it is showing.
 *
 * They are the game's own and not the library's: the All Time and in-year cards sit a few hundred
 * pixels below the hero and are the single home of those totals, so repeating them here is one
 * number in two places waiting to disagree.
 *
 * Every tile is conditional on the sheet holding what it reports. An in-progress game may have no
 * hours logged yet, a game logged with a bare year cannot be counted days into, and a game with
 * no siblings has no series to be placed in — and a tile reading zero says something false in all
 * three cases where saying nothing says the truth.
 *
 * `franchise` is the game's siblings including itself, which is what `franchiseIndex` already
 * groups for the card strips. `today` is a parameter rather than read from the clock, so the
 * figures are a function of the data alone.
 */
export const heroStats = (game: VideoGame, franchise: VideoGame[], today: YearMonthDay) => {
  const stats: { label: string; value: number | string }[] = [];

  if (game.hours) stats.push({ label: "Hours", value: game.hours });

  // `daysTo` throws rather than answering backwards, and returns nothing across a year-only
  // date. Both are the same answer here: there is no day count to show.
  const days = game.startDate.lte(today) ? game.startDate.daysTo(today) : undefined;
  if (days !== undefined) stats.push({ label: "Days In", value: days });

  if (game.franchise && franchise.length > 1) {
    stats.push({ label: `${game.franchise} Games`, value: franchise.length });
  }

  return stats;
};

/** Hours and days-to-beat averaged over games that were actually beaten and timed. */
export const perGameAverages = (data: VideoGame[]) => {
  const filtered = data.filter((game) => game.status === "Beat" && game.hours && game.numDays);
  return {
    hours: Math.round(filtered.sum("hours") / filtered.length),
    days: Math.round(filtered.sum("numDays") / filtered.length),
  };
};

// `hours` is asserted because every caller filters on it first. Dates are in the reader's voice
// and not the machine's, which is the same one the card behind the thumbnail speaks.
export const statsCardLabelEndDateHours = (game: VideoGame) => [
  [game.endDate ? formatDate(game.endDate) : "", `${format(game.hours!)} Hours`],
];

export const statsCardLabelStartDate = (game: VideoGame) => [[game.startDate ? formatDate(game.startDate) : ""]];

export const platformToShortChip = (vg: VideoGame) => {
  const [label, colour] = platformToShort(vg);
  return { label, colour };
};
