import { lazy, Suspense } from "react";
import useData from "../common/useData";
import { MoviesTab } from "../tabs";
import { movieDataConfig } from "./converter";
import { useFilterReducer } from "./filterUtils";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const MovieGraphs = () => {
  const [data, dataLoaded, error] = useData(movieDataConfig, MoviesTab);

  const [filterState, filterDispatch] = useFilterReducer();

  // Mounted here rather than inside the charts, because the case worth saying most is the one
  // where there are none: a reader arriving for the first time against a sheet the converter
  // rejects has nothing below this line, and the message naming the row is all there is to show.
  const notice = (
    <DataLoadedSnackbar
      open={dataLoaded}
      error={error}
    />
  );

  if (!data) {
    return notice;
  }

  const movieData = data.filter(filterState.filter);

  return (
    <Suspense>
      <Graphs
        filteredData={movieData}
        unfilteredData={data}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
      {notice}
    </Suspense>
  );
};

export default MovieGraphs;
