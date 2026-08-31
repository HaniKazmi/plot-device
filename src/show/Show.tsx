import { lazy, Suspense } from "react";
import { ShowsTab } from "../tabs";
import useData from "../common/useData.ts";
import { useFilterReducer } from "./filterUtils.ts";
import { showDataConfig } from "./converter.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const ShowsGraph = () => {
  const [data, dataLoaded] = useData(showDataConfig, ShowsTab);

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
