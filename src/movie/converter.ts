import { PlainDate } from "../common/date";
import type { Movie } from "./types";

export const jsonConverter = (json: Record<string, string>[]) => {
  return json
    .filter((row) => row.Genre !== "")
    .map((row) => {
      return {
        name: row.Name,
        releaseDate: PlainDate.from(row["Release Date"]),
        startDate: PlainDate.from(row["Watch Date"]),
        rating: parseInt(row.Rating),
        score: parseInt(row.Score),
        minutes: parseInt(row.Runtime),
        genre: row.Genre,
        director: row.Director,
        banner: row.Banner,
      } as Movie;
    });
};
