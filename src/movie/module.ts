import type { MediumModule, OmniItem } from "../common/medium";
import { movieEntry, movieSpan } from "./cardData";
import { movieDataConfig } from "./converter";
import { guestFilter } from "./filterUtils";
import { movieItemKey } from "./statsData";
import { movieFranchise } from "./franchiseContext";
import type { Measure, Movie } from "./types";

/** The units the tab counts in, in the rail. */
export const MEASURES: readonly Measure[] = ["Films", "Hours"];

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
    rating: movie.rating,
    source: movie,
  }));

export const movieModule: MediumModule<Movie> = {
  medium: "movie",
  tabId: "movies",
  noun: "films",
  data: movieDataConfig,
  guestFilter,
  franchiseOf: movieFranchise,
  toOmniItems: movieItems,
  // A film's span is its watch date at both ends, so there is no today for it to run to.
  entry: (movie, _today, hoverCard) => movieEntry(movie, hoverCard),
  span: movieSpan,
  banner: (movie) => movie.banner,
  title: (movie) => movie.name,
  measures: MEASURES,
  load: () => import("./module.lazy"),
};
