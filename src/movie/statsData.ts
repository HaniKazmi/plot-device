import { formatDate, type YearNumber } from "../common/date";
import { format } from "../utils/mathUtils";
import { releaseDecade } from "../utils/types";
import { cinemaLabel, scoreBand, type Measure, type Movie } from "./types";
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
 * Top band and drill-down cannot come to disagree about which bucket a film is in.
 */
export const movieGroupValue = (movie: Movie, key: MovieTopOption): string => {
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
 * Groups films by a category, ordered most-watched first. A film with no value for the category
 * is left out, and a franchise "group" of one film is too: the column repeats a standalone
 * film's own name, so a one-member group is a film naming itself, not a series — while a series'
 * first film genuinely shares the franchise's name and must stay in it.
 */
export const groupMoviesBy = (data: Movie[], key: MovieTopOption, measure: Measure) =>
  Object.entries(
    Object.groupBy(
      data.filter((movie) => movieGroupValue(movie, key)),
      (movie) => movieGroupValue(movie, key),
    ) as Record<string, Movie[]>,
  )
    .filter(([, movies]) => key !== "franchise" || movies.length > 1)
    .map(([name, movies]) => ({
      name,
      count: measureOf(movies, measure),
      // Scanned rather than sorted: only the longest film is wanted, for the group's artwork.
      top: movies.reduce((best, movie) => (movie.minutes > best.minutes ? movie : best)),
      all: movies,
    }))
    .sortByKey("count");

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

// Dates are in the reader's voice and not the machine's, which is the same one the card behind
// the thumbnail speaks. One cell per row: these sit under posters a third the width of the
// banners the other tabs label, and two cells collide into one run of digits. The score is
// already the card's corner chip, so neither label repeats it.
export const statsCardLabelWatched = (movie: Movie) => [[formatDate(movie.startDate)], [cinemaLabel(movie)]];

export const statsCardLabelScore = (movie: Movie) => [[formatDate(movie.startDate)], [`${format(movie.minutes)} min`]];
