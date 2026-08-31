import { formatDate, type YearNumber } from "../common/date";
import { format } from "../utils/mathUtils";
import { releaseDecade } from "../utils/types";
import { cinemaLabel, scoreBand, type Measure, type Movie, type MovieGroup } from "./types";
import { groupByCategory, realFranchisesOnly } from "../common/statsData";
import "../utils/arrayUtils";

/**
 * The categories the Top list offers, in the order its select box shows them.
 *
 * The order is load-bearing beyond presentation: `TopList` turns a category's index into a
 * Highcharts palette offset, so reordering this recolours those charts.
 */
export const movieTopOptions = ["genre", "director", "franchise", "rating", "decade", "cinema", "score"] as const;

export type MovieTopOption = (typeof movieTopOptions)[number];

/**
 * A grouping's value for one film, worded the way a card should read it. This is the single
 * definition of the three derived keys — decade, cinema, score band — so the sunburst, barchart,
 * Top band and drill-down cannot come to disagree about which bucket a film is in. It answers
 * for the whole `MovieGroup` union rather than only the Top list's options, so a chart offering
 * any grouping calls it without a cast.
 */
export const movieGroupValue = (movie: Movie, key: Exclude<MovieGroup, "none">): string => {
  switch (key) {
    case "decade":
      return releaseDecade(movie.releaseDate.year);
    case "cinema":
      return cinemaLabel(movie);
    case "score":
      return scoreBand(movie.score);
    default:
      return movie[key];
  }
};

const measureOf = (movies: Movie[], measure: Measure) =>
  measure === "Hours" ? Math.floor(movies.sum("minutes") / 60) : movies.length;

/**
 * Groups films by a category, ordered most-watched first. The artwork scan is a reduce rather
 * than a sort: only the longest film is wanted.
 */
export const groupMoviesBy = (data: Movie[], key: MovieTopOption, measure: Measure) =>
  groupByCategory(
    data,
    (movie) => movieGroupValue(movie, key),
    (movies) => measureOf(movies, measure),
    (movies) => movies.reduce((best, movie) => (movie.minutes > best.minutes ? movie : best)),
    key === "franchise" ? realFranchisesOnly : undefined,
  );

export const allTimeTotals = (data: Movie[]) => ({
  films: data.length,
  hours: Math.floor(data.sum("minutes") / 60),
});

/**
 * Totals for the films watched in `year`. The year is a parameter rather than read from the
 * clock, so the numbers are a function of the data alone.
 */
export const filmsInYear = (data: Movie[], year: YearNumber) =>
  allTimeTotals(data.filter((movie) => movie.startDate.year === year));

/**
 * Films and hours per year, averaged over the years anything was watched. Years with nothing
 * logged are absent rather than counted as zero, so the average is over active years.
 */
export const yearlyAverages = (data: Movie[]) => {
  const years = new Set(data.map((movie) => movie.startDate.year));
  const count = years.size || 1;
  return {
    films: Math.round(data.length / count),
    hours: Math.floor(data.sum("minutes") / 60 / count),
  };
};

/** Runtime over every film; the score only over the films that have one. */
export const perFilmAverages = (data: Movie[]) => {
  const scored = data.filter((movie) => movie.score !== undefined);
  return {
    minutes: data.length ? Math.round(data.sum("minutes") / data.length) : 0,
    score: scored.length ? Math.round((scored.sum("score") / scored.length) * 10) / 10 : 0,
  };
};

/** The film watched most recently — the page's hero. Every film has a watch date, so with any
 * data at all there is one. */
export const latestWatched = (data: Movie[]) => (data.length ? data.sortByKey("startDate")[0] : undefined);

/**
 * The figures the hero carries about the film it is showing. The score is dropped when the film
 * was never rated, and the franchise tile appears only where there is a series to count.
 */
export const movieHeroStats = (movie: Movie, franchiseCount: number) => {
  const stats: { label: string; value: number | string }[] = [];

  if (movie.score !== undefined) stats.push({ label: "Score", value: `${movie.score}/10` });
  stats.push({ label: "Minutes", value: movie.minutes });
  if (franchiseCount > 1) stats.push({ label: `${movie.franchise} Films`, value: franchiseCount });

  return stats;
};

// Dates are in the reader's voice and not the machine's, which is the same one the card behind
// the thumbnail speaks. One cell per row: these sit under posters a third the width of the
// banners the other tabs label, and two cells collide into one run of digits. The score is
// already the card's corner chip, so neither label repeats it.
export const statsCardLabelWatched = (movie: Movie) => [[formatDate(movie.startDate)], [cinemaLabel(movie)]];

export const statsCardLabelScore = (movie: Movie) => [[formatDate(movie.startDate)], [`${format(movie.minutes)} min`]];
