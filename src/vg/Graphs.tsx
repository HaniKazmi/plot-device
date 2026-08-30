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
import Filter from "./Filter";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { VG_SECTIONS, vgSections } from "./sections";
import { currentlyPlaying } from "./statsData";
import { format } from "../utils/mathUtils";
import { finishedCount } from "../common/finishedData";

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
    // Answered once for the page: it decides both whether the hero is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const playing = currentlyPlaying(data);

    return (
      <Stack spacing={2}>
        <SectionRail sections={vgSections(playing.length > 0)} />
        <Stats
          data={data}
          playing={playing}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          measure={filterState.measure}
          filterDispatch={filterDispatch}
        />
        <Section id={VG_SECTIONS.timeline}>
          <Timeline data={deferredData} />
        </Section>
        <Section id={VG_SECTIONS.charts}>
          <ChartPair
            left={
              <Sunburst
                data={deferredData}
                measure={filterState.measure}
              />
            }
            right={
              <Barchart
                data={deferredData}
                measure={filterState.measure}
                yearType={filterState.yearType}
              />
            }
          />
        </Section>
        <Section id={VG_SECTIONS.library}>
          <Finished
            MediaComponent={CardMediaImage}
            title="All Games"
            count={`${format(finishedCount(data))} games`}
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
