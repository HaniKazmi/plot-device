import { lazy, Suspense } from "react";
import useData, { dataCacheKey } from "../common/useData";
import { MoviesTab } from "../tabs";
import { jsonConverter } from "./converter";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

// v2: genres, franchise and cinema were added and rating retyped, none of which a v1 object has.
const storageKey = dataCacheKey("movie", 2);

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
