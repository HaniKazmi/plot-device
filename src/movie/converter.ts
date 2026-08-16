import { PlainDate } from "../common/date";
import { describing, sheetRow } from "../common/sheetError";
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

        return {
          name: row.Name,
          releaseDate: describing(`${where}, Release Date`, () => PlainDate.from(row["Release Date"])),
          startDate: describing(`${where}, Watch Date`, () => PlainDate.from(row["Watch Date"])),
          rating: parseInt(row.Rating),
          score: parseInt(row.Score),
          minutes: parseInt(row.Runtime),
          genre: row.Genre,
          director: row.Director,
          banner: row.Banner,
        } as Movie;
      })
  );
};
