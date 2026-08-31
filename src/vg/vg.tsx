import { lazy, Suspense } from "react";
import { useFilterReducer } from "./filterUtils.ts";
import { VideoGamesTab } from "../tabs";
import useData from "../common/useData.ts";
import { vgDataConfig } from "./converter.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const GamesGraphs = () => {
  const [data, dataLoaded] = useData(vgDataConfig, VideoGamesTab);
  const [filterState, filterDispatch] = useFilterReducer();

  if (!data) {
    return null;
  }

  const filteredData = data.filter(filterState.filter);

  return (
    <Suspense>
      <Graphs
        filteredData={filteredData}
        unfilteredData={data}
        dataLoaded={dataLoaded}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
    </Suspense>
  );
};

export default GamesGraphs;
