import { lazy, Suspense } from "react";
import { Movie } from "./types";
import useData from "../common/useData";
import { MoviesTab } from "../tabs";
import { PlainDate } from "../common/date";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const storageKey = "movie-data-cache";

const MovieGraphs = () => {
  const [data] = useData(storageKey, MoviesTab, jsonConverter);

  if (!data) {
    return null;
  }

  return (
    <Suspense>
      <Graphs data={data} />
    </Suspense>
  );
};

const jsonConverter = (json: Record<string, string>[]) => {
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

export default MovieGraphs;
