import { PlainDate } from "../common/date";
import { describing, readAgeRating, sheetRow } from "../common/sheetError";
import { splitCell } from "../utils/stringUtils";
import type { Movie } from "./types";

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
          rating: readAgeRating(row.Rating, `${where}, Rating`),
          // A film nobody scored is left out rather than counted as NaN, which would propagate
          // into any average taken over the column and blank the figure far from here.
          score: Number.isNaN(score) ? undefined : score,
          minutes: parseInt(row.Runtime),
          genre: row.Genre,
          genres: splitCell(row.Genres),
          franchise: row.Franchise,
          director: row.Director,
          banner: row.Banner,
          // The sheet writes only the true case and leaves the cell blank otherwise.
          cinema: row.Cinema === "TRUE",
          anime: row.Anime === "TRUE",
        } as Movie;
      })
  );
};
