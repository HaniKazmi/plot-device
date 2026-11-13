import { dataCacheKey, type DataConfig } from "../common/useData";
import { readCertificate, readChecked, readFullDate, readGenre, readStyle, sheetRow } from "../common/sheetError";
import { splitCell } from "../utils/stringUtils";
import { VENUES, type Movie } from "./types";

/**
 * Where a film was seen, as the sheet words it. Checked rather than defaulted: a worded column has
 * no blank case, so anything outside the vocabulary — a typo, or a header named wrongly here, which
 * is every row at once — would otherwise land silently as one venue, a library indistinguishable
 * from one seen entirely at home.
 */
const readVenue = readChecked(VENUES, "a venue");

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
    const seriesNumber = parseFloat(row["Series #"]);
    const minutes = parseInt(row["Runtime (min)"]);

    return {
      name: row.Title,
      // Read as a full date, like `startDate` below and for the same reason: the model types it as
      // one, and the `as Movie` below would let a bare year land in a `YearMonthDay` unremarked.
      releaseDate: readFullDate(row["Release Date"], `${where}, Release Date`),
      // The model types this as a full date and every surface reading it needs the day: the
      // stacked timeline places a film through `buildStrip`, which compares dates as strings, so a
      // bare year falls outside the year it is in and drops off without a word.
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
      venue: readVenue(row.Format, `${where}, Format`),
      style: readStyle(row.Style, `${where}, Style`),
    } as Movie;
  });
};

/** Bump the version on any change to the model's shape, or a returning visitor's cache lacks the field. */
export const movieDataConfig: DataConfig<Movie> = {
  storageKey: dataCacheKey("movie", 6),
  converter: jsonConverter,
};
