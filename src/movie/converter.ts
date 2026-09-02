import { PlainDate } from "../common/date";
import { dataCacheKey, type DataConfig } from "../common/useData";
import { describing, readAgeRating, readFullDate, readGenre, sheetRow } from "../common/sheetError";
import { splitCell } from "../utils/stringUtils";
import type { Movie } from "./types";

export const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row, index) => {
    const where = `Row ${sheetRow(index)}, "${row.Name || "?"}"`;
    // Read before the columns below rather than in place among them: a row nobody has
    // finished is missing every cell from here rightwards, and "no genre recorded" says that
    // where the first date to be parsed would report an unparseable cell instead — true, but
    // a narrower answer to a wider question. Key order in the literal below would otherwise
    // decide which one surfaces.
    const genre = readGenre(row.Genre, `${where}, Genre`);
    const score = parseInt(row.Score);
    const minutes = parseInt(row.Runtime);

    return {
      name: row.Name,
      releaseDate: describing(`${where}, Release Date`, () => PlainDate.from(row["Release Date"])),
      // The model types this as a full date and every surface reading it needs the day:
      // `watchTimelineData` compares it as a string, so a bare year falls outside the range it is
      // in and drops off the ribbon without a word, and `MovieTimelineCard` places it as NaN.
      startDate: readFullDate(row["Watch Date"], `${where}, Watch Date`),
      rating: readAgeRating(row.Rating, `${where}, Rating`),
      // A film nobody scored is left out rather than counted as NaN, which would propagate
      // into any average taken over the column and blank the figure far from here.
      score: Number.isNaN(score) ? undefined : score,
      // A blank Runtime becomes 0 rather than NaN — `sum` accumulates with `+`, so one NaN
      // would blank every hours total and average taken over the column. Unlike `score`,
      // `minutes` is not optional on the model, so 0 is the value that keeps sums honest.
      minutes: Number.isNaN(minutes) ? 0 : minutes,
      genre,
      genres: splitCell(row.Genres),
      franchise: row.Franchise,
      director: row.Director,
      banner: row.Banner,
      // The sheet writes only the true case and leaves the cell blank otherwise.
      cinema: row.Cinema === "TRUE",
      anime: row.Anime === "TRUE",
    } as Movie;
  });
};

/**
 * The cache this converter's output is read back from, shared by the Movies tab and by Omnibus so
 * a version bump cannot land at one of them alone.
 *
 * v3: a cached object written before `anime` reads as false for every film, and guest mode then
 * hides nothing.
 */
export const movieDataConfig: DataConfig<Movie> = {
  storageKey: dataCacheKey("movie", 3),
  converter: jsonConverter,
};
