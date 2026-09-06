import Stats from "./Stats";
import { VideoGame, companyToColor } from "./types";
import { vgModule } from "./module";
import { useScheme } from "../common/useScheme";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import CardMediaImage from "./CardMediaImage";
import { activeCount, FilterDispatch, FilterState } from "./filterUtils";
import { FranchiseContext, vgFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { usePhone } from "../common/breakpoints";
import { ChartPair, ChartsAndLibrary, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { isFilteredEmpty } from "../common/population";
import { NothingMatches } from "../common/NothingMatches";
import { VG_SECTIONS, vgSections } from "./sections";
import { currentlyPlaying } from "./statsData";
import { wallPopulation } from "../common/finishedData";

/** What the wall's card borders speak, and the key beneath its header names. */
const VG_BORDER = { key: "company", valueOf: (game: VideoGame) => game.company };

const SuspenseBlock = ({
  filteredData,
  unfilteredData,
  filterState,
  filterDispatch,
}: {
  filteredData: VideoGame[];
  unfilteredData: VideoGame[];
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, vgFranchise)}>
    <Graphs
      data={filteredData}
      filterState={filterState}
      filterDispatch={filterDispatch}
    />
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
    const scheme = useScheme();
    const deferredData = useDeferredValue(data, []);
    // Answered once for the page: it decides both whether the hero is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const playing = currentlyPlaying(data);
    // The phone reads the library before the charts. One answer for the page and the rail alike:
    // `ChartsAndLibrary` orders the two sections and `chartsLastOrder`, inside the sections list,
    // orders the chips naming them.
    const chartsLast = usePhone();
    // Built once for the whole page rather than per shell, off the same figures the rail's own
    // chip states: a chart's further narrowing (the Party control, the timeline's 2015 floor) is
    // not what the message answers for, only the reader's own filters.
    const nothingMatches = isFilteredEmpty(data.length, activeCount(filterState)) ? (
      <NothingMatches onClear={() => filterDispatch({ type: "resetFilters" })} />
    ) : undefined;

    const charts = (
      <Section
        key={VG_SECTIONS.charts}
        id={VG_SECTIONS.charts}
      >
        <ChartPair
          left={
            <Sunburst
              data={deferredData}
              measure={filterState.measure}
              empty={nothingMatches}
            />
          }
          right={
            <Barchart
              data={deferredData}
              measure={filterState.measure}
              yearType={filterState.yearType}
              empty={nothingMatches}
            />
          }
        />
      </Section>
    );

    const library = (
      <Section
        key={VG_SECTIONS.library}
        id={VG_SECTIONS.library}
      >
        <Finished
          count={wallPopulation(data, vgModule.noun)}
          MediaComponent={CardMediaImage}
          title="All Games"
          border={VG_BORDER}
          data={data}
          colour={(item) => companyToColor(item, scheme)}
          landscape
          empty={nothingMatches}
        />
      </Section>
    );

    return (
      <Stack spacing={2}>
        <PageRail
          sections={vgSections(playing.length > 0, chartsLast)}
          count={data.length}
        />
        <Stats
          data={data}
          playing={playing}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          measure={filterState.measure}
          empty={nothingMatches}
        />
        <Section id={VG_SECTIONS.timeline}>
          <Timeline
            data={deferredData}
            empty={nothingMatches}
          />
        </Section>
        <ChartsAndLibrary
          charts={charts}
          library={library}
          chartsLast={chartsLast}
        />
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
