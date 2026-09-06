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
import { SchemaFilterDrawer } from "../common/FilterControls";
import { vgFilters } from "./filters";
import { filterIcons } from "./filterIcons";
import { ChartPair, ChartsAndLibrary, Section, SectionRail } from "../common/SectionRail";
import { FilterChip } from "../common/FilterDrawer";
import { stated } from "../common/population";
import { MeasureControl } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { VG_SECTIONS, vgSections } from "./sections";
import { currentlyPlaying, earliestYear } from "./statsData";
import { wallPopulation } from "../common/finishedData";
import type { YearNumber } from "../common/date";

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
      // Read from the whole library rather than what the filters left, so picking "In 2020"
      // cannot strand the reader at 2020 by making that year the earliest one on offer.
      earliestYear={earliestYear(unfilteredData)}
      filterState={filterState}
      filterDispatch={filterDispatch}
    />
    <SchemaFilterDrawer
      schema={vgFilters}
      icons={filterIcons}
      state={filterState}
      dispatch={filterDispatch}
      data={unfilteredData}
      activeCount={activeCount(filterState)}
      onReset={() => filterDispatch({ type: "resetFilters" })}
    />
  </FranchiseContext.Provider>
);

const Graphs = memo(
  ({
    data,
    earliestYear,
    filterState,
    filterDispatch,
  }: {
    data: VideoGame[];
    earliestYear: YearNumber;
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const scheme = useScheme();
    const deferredData = useDeferredValue(data, []);
    const tabs = useOtherTabs();
    // Answered once for the page: it decides both whether the hero is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const playing = currentlyPlaying(data);
    // The phone reads the library before the charts. One answer for the page and the rail alike:
    // `ChartsAndLibrary` orders the two sections and `chartsLastOrder`, inside the sections list,
    // orders the chips naming them.
    const chartsLast = usePhone();

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
        />
      </Section>
    );

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={vgSections(playing.length > 0, chartsLast)}
          tabs={tabs}
          actions={
            <MeasureControl
              measures={vgModule.measures}
              value={filterState.measure}
              dispatch={filterDispatch}
            />
          }
          trailing={
            <FilterChip
              label={stated(data.length, vgModule.noun)}
              activeCount={activeCount(filterState)}
            />
          }
        />
        <Stats
          data={data}
          playing={playing}
          earliestYear={earliestYear}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          measure={filterState.measure}
          filterDispatch={filterDispatch}
        />
        <Section id={VG_SECTIONS.timeline}>
          <Timeline data={deferredData} />
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
