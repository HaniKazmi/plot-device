import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import CardMediaImage from "./CardMediaImage";
import { FilterDispatch, FilterState } from "./filterUtils";
import { memo, useDeferredValue, useState } from "react";
import { Snackbar, Stack } from "@mui/material";
import Filter from "./Filter";

const SuspenseBlock = ({
  filteredData,
  dataLoaded,
  unfilteredData,
  filterState,
  filterDispatch,
}: {
  filteredData: VideoGame[];
  unfilteredData: VideoGame[];
  dataLoaded: boolean;
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  <>
    <Graphs
      data={filteredData}
      filterState={filterState}
      filterDispatch={filterDispatch}
    />
    <Filter
      state={filterState}
      dispatch={filterDispatch}
      data={unfilteredData}
    />
    <DataLoadedSnackbar open={dataLoaded} />
  </>
);

const Graphs = memo(
  ({
    data,
    filterState,
    filterDispatch,
  }: {
    data: VideoGame[];
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const deferredData = useDeferredValue(data, []);
    return (
      <Stack spacing={2}>
        <Stats
          data={data}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          measure={filterState.measure}
          filterDispatch={filterDispatch}
        />
        <Timeline data={deferredData} />
        <Sunburst
          data={deferredData}
          measure={filterState.measure}
        />
        <Barchart
          data={deferredData}
          measure={filterState.measure}
          yearType={filterState.yearType}
        />
        <Finished
          MediaComponent={CardMediaImage}
          title="All Games"
          data={data}
          width={4}
          colour={companyToColor}
          landscape
        />
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

const DataLoadedSnackbar = ({ open }: { open: boolean }) => {
  const [snackbarClosed, setSnackbarClosed] = useState(false);

  return (
    <Snackbar
      open={open && !snackbarClosed}
      autoHideDuration={1000}
      onClose={() => setSnackbarClosed(true)}
      message="Refresh Complete"
    />
  );
};

export default SuspenseBlock;
