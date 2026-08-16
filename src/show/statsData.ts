import type { YearNumber } from "../common/date";
import { format } from "../utils/mathUtils";
import type { Season, Show } from "./types";
import "../utils/arrayUtils";

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

  const years = Object.keys(grouped).length;
  return {
    seasons: Math.floor(Object.values(grouped).sum("seasons") / years),
    episodes: Math.floor(Object.values(grouped).sum("episodes") / years),
    // Minutes are averaged first and converted second, so this is the floor of the average
    // hours rather than the average of per-year floored hours.
    hours: Math.floor(Object.values(grouped).sum("minutes") / years / 60),
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

export const recentlyComplete = (data: Show[], limit = 18) =>
  data
    .flatMap((show) => show.s)
    .filter((season) => season.endDate)
    .sortByKey("endDate")
    .slice(0, limit);

/**
 * The in-progress season of every show still being watched.
 *
 * `at(-1)` is asserted non-null: a show marked Watching whose season list is empty yields
 * undefined here, and the `endDate` check on the next line then throws. `Show.s` carries no
 * non-empty guarantee, and the converter's pre-2006 season cutoff is one way to produce one.
 */
export const currentlyWatching = (data: Show[]) =>
  data
    .filter((show) => show.status === "Watching")
    .map((show) => show.s.at(-1)!)
    .filter((season) => !season.endDate)
    .sortByKey("startDate");

export const statsCardLabelRecentlyComplete = (season: Season) => [
  [`S ${season.s}`, season.endDate?.toString() ?? ""],
  [`${season.e} Eps`, `${format(Math.round(season.minutes / 60))} Hours`],
];

export const statsCardLabelCurrentlyPlaying = (season: Season) => [
  [`S ${season.s}`, season.startDate?.toString() ?? ""],
];
