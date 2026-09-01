import { lazy, Suspense } from "react";
import { useFilterReducer } from "./filterUtils.ts";
import { VideoGamesTab } from "../tabs";
import useData from "../common/useData.ts";
import { vgDataConfig } from "./converter.ts";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const GamesGraphs = () => {
  const [data, dataLoaded, error] = useData(vgDataConfig, VideoGamesTab);
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

  const filteredData = data.filter(filterState.filter);

  return (
    <Suspense>
      <Graphs
        filteredData={filteredData}
        unfilteredData={data}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
      {notice}
    </Suspense>
  );
};

export default GamesGraphs;
