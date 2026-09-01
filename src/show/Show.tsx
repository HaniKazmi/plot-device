import { lazy, Suspense } from "react";
import { ShowsTab } from "../tabs";
import useData from "../common/useData.ts";
import { useFilterReducer } from "./filterUtils.ts";
import { showDataConfig } from "./converter.ts";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const ShowsGraph = () => {
  const [data, dataLoaded, error] = useData(showDataConfig, ShowsTab);

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

  const showData = data.filter(filterState.filter);

  return (
    <Suspense>
      <Graphs
        filteredData={showData}
        unfilteredData={data}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
      {notice}
    </Suspense>
  );
};

export default ShowsGraph;
