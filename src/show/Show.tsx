import { lazy, Suspense, useMemo } from "react";
import { ShowsTab } from "../tabs";
import useData from "../common/useData.ts";
import { useFilterReducer } from "./filterUtils.ts";
import { dropSeasonParents, jsonConverter, reviveSeasonParents } from "./converter.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const storageKey = "show-data-cache";

const ShowsGraph = () => {
  const [data] = useData(storageKey, ShowsTab, jsonConverter, reviveSeasonParents, dropSeasonParents);

  const [filterState, filterDispatch] = useFilterReducer();
  const showData = useMemo(() => (data ? data.filter(filterState.filter) : []), [data, filterState.filter]);

  if (!data) {
    return null;
  }

  return (
    <Suspense>
      <Graphs
        data={showData}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
    </Suspense>
  );
};

export default ShowsGraph;
