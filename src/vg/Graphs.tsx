import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import CardMediaImage from "./CardMediaImage";
import { FilterDispatch, FilterState, guestFilter } from "./filterUtils";
import { FranchiseContext } from "./franchiseContext";
import { franchiseIndex } from "./cardData";
import { memo, useDeferredValue, useState } from "react";
import { Snackbar, Stack } from "@mui/material";
import Grid from "@mui/material/Grid";
import Filter from "./Filter";
import { Section, SectionRail } from "../common/SectionRail";
import { VG_SECTIONS, vgSections } from "./sections";

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
  // Built from the unfiltered data, because a card's franchise strip is about the series and not
  // about the current view — filtering to one platform would otherwise amputate it. Guest mode is
  // the exception: it hides content rather than narrowing a view, so it is applied here too.
  <FranchiseContext.Provider
    value={franchiseIndex(filterState.guestMode ? unfilteredData.filter(guestFilter) : unfilteredData)}
  >
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
  </FranchiseContext.Provider>
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
        <SectionRail sections={vgSections(data)} />
        <Stats
          data={data}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          measure={filterState.measure}
          filterDispatch={filterDispatch}
        />
        <Section id={VG_SECTIONS.timeline}>
          <Timeline data={deferredData} />
        </Section>
        <Section id={VG_SECTIONS.charts}>
          {/* Side by side once there is width for it: the two answer the same question — where
              the hours went — through a hierarchy and through time, and reading one against the
              other is the point of having both. */}
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Sunburst
                data={deferredData}
                measure={filterState.measure}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Barchart
                data={deferredData}
                measure={filterState.measure}
                yearType={filterState.yearType}
              />
            </Grid>
          </Grid>
        </Section>
        <Section id={VG_SECTIONS.library}>
          <Finished
            MediaComponent={CardMediaImage}
            title="All Games"
            data={data}
            width={4}
            colour={companyToColor}
            landscape
          />
        </Section>
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
