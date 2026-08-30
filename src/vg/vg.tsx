import { lazy, Suspense } from "react";
import { useFilterReducer } from "./filterUtils.ts";
import { VideoGamesTab } from "../tabs";
import useData, { dataCacheKey } from "../common/useData.ts";
import { jsonConverter } from "./converter.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const storageKey = dataCacheKey("vg", 1);

const GamesGraphs = () => {
  const [data, dataLoaded] = useData(storageKey, VideoGamesTab, jsonConverter);
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
