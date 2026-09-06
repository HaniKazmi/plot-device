import { YearMonthDay } from "../../src/common/date";
import type { Movie } from "../../src/movie/types";

/**
 * A whole `Movie`, as the converter would have built it, for tests that start from the model
 * rather than from sheet rows.
 *
 * One builder rather than one per test file: every field on `Movie` but `score` is required, so a
 * field added to the model breaks each copy of this at once, and several copies drift into
 * disagreeing about what a default film looks like.
 */
export const movie = (overrides: Partial<Movie> = {}): Movie => ({
  name: "Arrival",
  releaseDate: YearMonthDay.get(2016, 11, 11),
  startDate: YearMonthDay.get(2017, 1, 14),
  certificate: "12",
  score: 9,
  minutes: 116,
  genre: "Sci-Fi",
  otherGenres: ["Drama", "Mystery"],
  franchise: "Arrival",
  series: "",
  director: "Denis Villeneuve",
  artwork: "arrival.jpg",
  cinema: true,
  anime: false,
  ...overrides,
});
