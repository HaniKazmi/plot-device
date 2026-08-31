import { lazy, Suspense } from "react";
import useData from "../common/useData";
import { MoviesTab } from "../tabs";
import { movieDataConfig } from "./converter";
import { useFilterReducer } from "./filterUtils";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const MovieGraphs = () => {
  const [data, dataLoaded] = useData(movieDataConfig, MoviesTab);

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
