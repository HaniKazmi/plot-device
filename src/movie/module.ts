import type { MediumModule, OmniItem } from "../common/medium";
import { movieEntry, movieSpan } from "./cardData";
import { movieDataConfig } from "./converter";
import { guestFilter, movieFilters } from "./filters";
import { pageState } from "./filterUtils";
import { MOVIE_EPOCH, movieItemKey } from "./statsData";
import type { Measure, Movie } from "./types";

/** A film as one row of the union. */
const movieItems = (movies: Movie[]): OmniItem[] =>
  movies.map((movie): OmniItem => ({
    medium: "movie",
    // A rewatch is a second row with the same title, and the day it was seen separates the two.
    key: movieItemKey(movie),
    name: movie.name,
    // A film's watch date is both when it happened and when it closed, so it is one date wearing
    // both names rather than a start with no end.
    closeDate: movie.startDate,
    year: movie.startDate.year,
    hours: movie.minutes / 60,
    genre: movie.genre,
    genres: movie.genres,
    franchise: movie.franchise,
    certificate: movie.certificate,
    source: movie,
  }));

export const movieModule: MediumModule<Movie, Movie, Measure> = {
  medium: "movie",
  tabId: "movies",
  noun: "films",
  data: movieDataConfig,
  guestFilter,
  toOmniItems: movieItems,
  // A film's span is its watch date at both ends, so there is no today for it to run to.
  entry: (movie, _today, hoverCard) => movieEntry(movie, hoverCard),
  span: movieSpan,
  banner: (movie) => movie.banner,
  title: (movie) => movie.name,
  // Title and release, so a rewatch joins the first viewing while a remake of the same name stays
  // a work of its own.
  work: (movie) => `${movie.name}-${movie.releaseDate}`,
  secondaryText: (movie) => [movie.director],
  facts: (movie) =>
    [movie.cinema ? "Cinema" : "Home", movie.score === undefined ? "" : `${movie.score}/10`, movie.director]
      .filter(Boolean)
      .join(" · "),
  measures: ["Films", "Hours"],
  /** The sheet's own epoch: this tab logs from 2001, whatever the rows it currently holds. */
  earliestYear: () => MOVIE_EPOCH.year,
  filters: movieFilters,
  pageState,
};
