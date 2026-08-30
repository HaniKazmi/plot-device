import { lazy, Suspense } from "react";
import { ShowsTab } from "../tabs";
import useData, { dataCacheKey } from "../common/useData.ts";
import { useFilterReducer } from "./filterUtils.ts";
import { dropSeasonParents, jsonConverter, reviveSeasonParents } from "./converter.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

// v2: the backfilled columns became required, so a v1 object is missing fields the cards read.
const storageKey = dataCacheKey("show", 2);

const ShowsGraph = () => {
  const [data, dataLoaded] = useData(storageKey, ShowsTab, jsonConverter, reviveSeasonParents, dropSeasonParents);

  const [filterState, filterDispatch] = useFilterReducer();

  if (!data) {
    return null;
  }

  const showData = data.filter(filterState.filter);

  return (
    <Suspense>
      <Graphs
        filteredData={showData}
        unfilteredData={data}
        dataLoaded={dataLoaded}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
    </Suspense>
  );
};

export default ShowsGraph;
