import { PlainDate } from "../common/date";
import { describing, sheetError, sheetRow } from "../common/sheetError";
import { isAgeRating, type AgeRating } from "../utils/types";
import type { Movie } from "./types";

/**
 * The secondary genres arrive as one comma-separated cell. Empty parts are dropped so a film with
 * none has an empty list rather than a list holding one empty string, which every reader would
 * otherwise have to filter before counting or rendering it.
 */
const splitGenres = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);

/**
 * Rejects a rating the colour map could not paint, while the row it came from is still known.
 * Left to reach `ageRatingToColour`, a bad cell throws from inside a render instead, naming the
 * value but not the film carrying it.
 */
const readRating = (value: string | undefined, where: string): AgeRating =>
  isAgeRating(value ?? "") ? (value as AgeRating) : sheetError(where, `"${value ?? ""}" is not an age rating`);

export const jsonConverter = (json: Record<string, string>[]) => {
  return (
    json
      // An empty Genre marks a row as not filled in yet. It is a completeness check rather than
      // anything to do with genre, and it does not cover the date columns below.
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.Genre !== "")
      .map(({ row, index }) => {
        const where = `Row ${sheetRow(index)}, "${row.Name || "?"}"`;
        const score = parseInt(row.Score);

        return {
          name: row.Name,
          releaseDate: describing(`${where}, Release Date`, () => PlainDate.from(row["Release Date"])),
          startDate: describing(`${where}, Watch Date`, () => PlainDate.from(row["Watch Date"])),
          rating: readRating(row.Rating, `${where}, Rating`),
          // A film nobody scored is left out rather than counted as NaN, which would propagate
          // into any average taken over the column and blank the figure far from here.
          score: Number.isNaN(score) ? undefined : score,
          minutes: parseInt(row.Runtime),
          genre: row.Genre,
          genres: splitGenres(row.Genres),
          franchise: row.Franchise,
          director: row.Director,
          banner: row.Banner,
          // The sheet writes only the true case and leaves the cell blank otherwise.
          cinema: row.Cinema === "TRUE",
        } as Movie;
      })
  );
};
