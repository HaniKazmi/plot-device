import { YearMonthDay, type YearNumber } from "../common/date";
import { buildStrip, type StripBand, type StripSpan } from "../common/timelineStripData";
import type { Movie } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

export interface WatchSpan extends StripSpan {
  movie: Movie;
}

export interface RibbonYear {
  year: YearNumber;
  bands: StripBand<WatchSpan>[];
  laneCount: number;
}

/**
 * One ribbon row per calendar year anything was watched, each film a mark at its watch date.
 *
 * Every row runs the full 1 January – 31 December, the current year included: a shorter final
 * row would read as its own scale, and one shared scale is what lets density and seasonality be
 * compared down the stack — the current year simply runs out of marks.
 *
 * A film is a point in time, so `start === end` and the width every band draws at is
 * `buildStrip`'s minimum. Films watched within days of each other land on the same spot and are
 * tiled clear of one another inside the lane rather than stacking, which is also why `laneCount`
 * stays at one for any ordinary year. Years nothing was watched in are absent rather than empty
 * rows — a gap in the habit is real, but twenty blank tracks say it worse than the jump in the
 * row labels does.
 */
export const watchRibbonYears = (data: Movie[]): RibbonYear[] => {
  const byYear = data.reduce((map, movie) => {
    map.setIfAbsent(movie.startDate.year, []).push(movie);
    return map;
  }, new Map<YearNumber, Movie[]>());

  return [...byYear.entries()]
    .map(([year, movies]) => {
      const { bands, laneCount } = buildStrip(
        movies.map((movie) => ({
          key: `${movie.name}-${movie.startDate}`,
          start: movie.startDate,
          end: movie.startDate,
          movie,
        })),
        YearMonthDay.get(year, 1, 1),
        YearMonthDay.get(year, 12, 31),
      );
      return { year, bands, laneCount };
    })
    .toSorted((a, b) => a.year - b.year);
};
