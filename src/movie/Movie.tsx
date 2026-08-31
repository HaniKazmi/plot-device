import { lazy, Suspense } from "react";
import useData, { dataCacheKey } from "../common/useData";
import { MoviesTab } from "../tabs";
import { jsonConverter } from "./converter";
import { useFilterReducer } from "./filterUtils";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

// v3: anime was added for guest mode. A v2 object without it would read as false for every
// film, and guest mode would silently hide nothing.
const storageKey = dataCacheKey("movie", 3);

const MovieGraphs = () => {
  const [data, dataLoaded] = useData(storageKey, MoviesTab, jsonConverter);

  const [filterState, filterDispatch] = useFilterReducer();

  if (!data) {
    return null;
  }

  const movieData = data.filter(filterState.filter);

  return (
    <Suspense>
      <Graphs
        filteredData={movieData}
        unfilteredData={data}
        dataLoaded={dataLoaded}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
    </Suspense>
  );
};

export default MovieGraphs;
