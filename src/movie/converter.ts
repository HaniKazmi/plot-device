import { dataCacheKey, type DataConfig } from "../common/useData";
import { readCertificate, readFullDate, readGenre, sheetError, sheetRow } from "../common/sheetError";
import { splitCell } from "../utils/stringUtils";
import type { Movie } from "./types";

/**
 * Reads how a film was seen, as a boolean the model keeps: the sheet states the reading and the
 * app asks the question one way round.
 *
 * Checked rather than compared. The column used to be a flag written only in its true case, where
 * a blank *was* the false case and there was nothing to reject; a worded column has no blank case,
 * so anything outside these two — a typo, or a header this converter names wrongly, which is every
 * row at once — would land silently as Home and be indistinguishable from a library of home
 * viewing.
 */
const readCinema = (value = "", where: string): boolean => {
  if (value === "Cinema") return true;
  if (value === "Home") return false;
  return sheetError(where, `"${value}" is neither Cinema nor Home`);
};

/**
 * Reads whether a film is anime, on the same reasoning — and this one matters more: guest mode
 * hides anime, so a value that silently fails to say so puts a hidden film on screen. It is the
 * only cell on this sheet whose misreading costs more than a wrong figure.
 */
const readAnime = (value = "", where: string): boolean => {
  if (value === "anime") return true;
  if (value === "film") return false;
  return sheetError(where, `"${value}" is neither film nor anime`);
};

export const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row, index) => {
    const where = `Row ${sheetRow(index)}, "${row.Title || "?"}"`;
    // Read before the columns below rather than in place among them: a row nobody has
    // finished is missing every cell from here rightwards, and "no genre recorded" says that
    // where the first date to be parsed would report an unparseable cell instead — true, but
    // a narrower answer to a wider question. Key order in the literal below would otherwise
    // decide which one surfaces.
    const genre = readGenre(row.Genre, `${where}, Genre`);
    const score = parseInt(row.Score);
    const seriesNumber = parseInt(row["Series #"]);
    const minutes = parseInt(row["Runtime (min)"]);

    return {
      name: row.Title,
      // Read as a full date, like `startDate` below and for the same reason: the model types it as
      // one, and the `as Movie` below would let a bare year land in a `YearMonthDay` unremarked.
      releaseDate: readFullDate(row["Release Date"], `${where}, Release Date`),
      // The model types this as a full date and every surface reading it needs the day:
      // `watchTimelineData` compares it as a string, so a bare year falls outside the range it is
      // in and drops off the ribbon without a word, and `MovieTimelineCard` places it as NaN.
      startDate: readFullDate(row["Watch Date"], `${where}, Watch Date`),
      certificate: readCertificate(row.Certificate, `${where}, Certificate`),
      // A film nobody scored is left out rather than counted as NaN, which would propagate
      // into any average taken over the column and blank the figure far from here.
      score: Number.isNaN(score) ? undefined : score,
      // A blank runtime becomes 0 rather than NaN — `sum` accumulates with `+`, so one NaN
      // would blank every hours total and average taken over the column. Unlike `score`,
      // `minutes` is not optional on the model, so 0 is the value that keeps sums honest.
      minutes: Number.isNaN(minutes) ? 0 : minutes,
      genre,
      otherGenres: splitCell(row["Other Genres"]),
      franchise: row.Franchise,
      series: row.Series ?? "",
      seriesNumber: Number.isNaN(seriesNumber) ? undefined : seriesNumber,
      director: row.Director,
      artwork: row.Artwork ?? "",
      cinema: readCinema(row.Format, `${where}, Format`),
      anime: readAnime(row.Type, `${where}, Type`),
    } as Movie;
  });
};

/**
 * The cache this converter's output is read back from, shared by the Movies tab and by Omnibus so
 * a version bump cannot land at one of them alone.
 *
 * v3: a cached object written before `anime` reads as false for every film, and guest mode then
 * hides nothing.
 * v4: a cached object written before this holds its picture under `banner`, so every card on
 * every surface draws the stand-in instead.
 */
export const movieDataConfig: DataConfig<Movie> = {
  storageKey: dataCacheKey("movie", 4),
  converter: jsonConverter,
};
