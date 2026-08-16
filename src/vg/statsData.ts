import type { YearNumber } from "../common/date";
import { assignPercents, format } from "../utils/mathUtils";
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
  "genre",
] as const satisfies Exclude<VideoGameStringKeys, "name">[];

export type TopOption = (typeof topOptions)[number];

/** Groups completed, time-tracked games by a category, ordered most-played first. */
export const groupGamesBy = (data: VideoGame[], key: VideoGameStringKeys, measure: Measure) =>
  Object.entries(
    Object.groupBy(
      data.filter((game) => game.hours && game.endDate),
      // Object.groupBy stringifies the key, so a game with no value for this category lands
      // under the literal string "undefined" rather than being skipped.
      (game) => game[key],
    ) as Record<string, VideoGame[]>,
  )
    .map(([name, games]) => ({
      name,
      count: measure === "Hours" ? games.sum("hours") : games.length,
      top: games.sortByKey("hours")[0],
      all: games,
    }))
    .sortByKey("count");

/**
 * The top `limit` categories plus an "Other" bucket holding the rest, as percentages.
 *
 * The percentages are scoped to the rows returned rather than to the whole dataset, so they
 * always sum to 100 — "Other" is what makes that true. The bucket carries no `top` game,
 * because it stands for several categories at once.
 */
export const topNWithOther = (data: VideoGame[], key: VideoGameStringKeys, measure: Measure, limit = 5) => {
  const allGroups = groupGamesBy(data, key, measure).filter(({ name }) => name && name !== "undefined" && name !== "");

  const grouped: { name: string; count: number; top?: VideoGame }[] = allGroups.slice(0, limit);
  const other = allGroups.slice(limit);
  if (other.length > 0) grouped.push({ name: "Other", count: other.sum("count") });

  return assignPercents(grouped, grouped.sum("count"));
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

  const years = Object.keys(grouped).length;
  return {
    games: parseFloat((Object.values(grouped).sum("games") / years).toFixed(2)),
    hours: parseFloat((Object.values(grouped).sum("hours") / years).toFixed(2)),
  };
};

/** Hours and days-to-beat averaged over games that were actually beaten and timed. */
export const perGameAverages = (data: VideoGame[]) => {
  const filtered = data.filter((game) => game.status === "Beat" && game.hours && game.numDays);
  return {
    hours: Math.round(filtered.sum("hours") / filtered.length),
    days: Math.round(filtered.sum("numDays") / filtered.length),
  };
};

// `hours` is asserted because every caller filters on it first.
export const statsCardLabelEndDateHours = (game: VideoGame) => [
  [game.endDate?.toString() ?? "", `${format(game.hours!)} Hours`],
];

export const statsCardLabelStartDate = (game: VideoGame) => [[game.startDate?.toString() ?? ""]];

export const platformToShortChip = (vg: VideoGame) => {
  const [label, colour] = platformToShort(vg);
  return { label, colour };
};
