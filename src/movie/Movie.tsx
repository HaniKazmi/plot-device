import { lazy, Suspense } from "react";
import useData from "../common/useData";
import { MoviesTab } from "../tabs";
import { jsonConverter } from "./converter";

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

export default MovieGraphs;
