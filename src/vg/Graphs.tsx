import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import CardMediaImage from "./CardMediaImage";
import { FilterDispatch, FilterState, guestFilter } from "./filterUtils";
import { FranchiseContext } from "./franchiseContext";
import { visibleFranchiseIndex } from "../common/franchiseIndex";
import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";
import Filter from "./Filter";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { useOtherTabs } from "../tabs";
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
  <FranchiseContext.Provider
    value={visibleFranchiseIndex(unfilteredData, (game) => game.franchise, filterState.guestMode, guestFilter)}
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
    const tabs = useOtherTabs();
    // Answered once for the page: it decides both whether the hero is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const playing = currentlyPlaying(data);

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={vgSections(playing.length > 0)}
          tabs={tabs}
        />
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

export default SuspenseBlock;
