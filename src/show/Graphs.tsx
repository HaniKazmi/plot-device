import { Stack } from "@mui/material";
import { usePhone } from "../common/breakpoints";
import type { YearNumber } from "../common/date";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { ChartPair, ChartsAndLibrary, Section, SectionRail } from "../common/SectionRail";
import { FilterChip, PageChip } from "../common/PageHandles";
import { stated } from "../common/population";
import { MeasureControl, ScopeControl } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { SHOW_SECTIONS, showSections } from "./sections";
import { currentlyWatching, earliestYear } from "./statsData";
import Timeline from "./Timeline";
import { Show } from "./types";
import { showModule } from "./module";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import { FranchiseContext, showFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { memo, useDeferredValue } from "react";
import { wallPopulation } from "../common/finishedData";
import { useScheme } from "../common/useScheme";

/** What the wall's card borders speak, and the key beneath its header names. */
const SHOW_BORDER = { key: "status", valueOf: (show: Show) => show.status };

const SuspenseBlock = ({
  filteredData,
  unfilteredData,
  filterState,
  filterDispatch,
}: {
  filteredData: Show[];
  unfilteredData: Show[];
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, showFranchise)}>
    <Graphs
      data={filteredData}
      // The floor of the rail's year picker, read from the whole library rather than from what the
      // filters left: derived from the filtered data, picking "In 2020" would leave 2020 the
      // earliest year on offer and strand the reader in it.
      earliestYear={earliestYear(unfilteredData)}
      filterState={filterState}
      filterDispatch={filterDispatch}
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
    data: Show[];
    earliestYear: YearNumber;
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const scheme = useScheme();

    const deferredData = useDeferredValue(data, []);
    const tabs = useOtherTabs();
    // Answered once for the page: it decides both whether the "now" strip is rendered and whether
    // the rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const watching = currentlyWatching(data);
    // The phone reads the library before the charts. One answer for the page and the rail alike:
    // `ChartsAndLibrary` orders the two sections and `chartsLastOrder`, inside the sections list,
    // orders the chips naming them.
    const chartsLast = usePhone();

    const charts = (
      <Section
        key={SHOW_SECTIONS.charts}
        id={SHOW_SECTIONS.charts}
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
        key={SHOW_SECTIONS.library}
        id={SHOW_SECTIONS.library}
      >
        <Finished
          count={wallPopulation(data, showModule.noun)}
          title="All Shows"
          border={SHOW_BORDER}
          data={data}
          colour={(item) => statusToColour(item, scheme)}
          MediaComponent={ShowCardMediaImage}
        />
      </Section>
    );

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={showSections(watching.length > 0, chartsLast)}
          tabs={tabs}
          scope={
            <ScopeControl
              label="Years"
              yearTo={filterState.yearTo}
              yearType={filterState.yearType}
              earliestYear={earliestYear}
              dispatch={filterDispatch}
            />
          }
          measure={
            <MeasureControl
              measures={showModule.measures}
              value={filterState.measure}
              dispatch={filterDispatch}
            />
          }
          population={
            <FilterChip
              label={stated(data.length, showModule.noun)}
              activeCount={activeCount(filterState)}
            />
          }
          pageChip={
            <PageChip
              measure={filterState.measure}
              activeCount={activeCount(filterState)}
            />
          }
        />
        <Stats
          data={data}
          watching={watching}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
        />
        <Section id={SHOW_SECTIONS.timeline}>
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
