import { Stack } from "@mui/material";
import { usePhone } from "../common/breakpoints";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { ChartPair, ChartsAndLibrary, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { isFilteredEmpty } from "../common/population";
import { NothingMatches } from "../common/NothingMatches";
import { SHOW_SECTIONS, showSections } from "./sections";
import { currentlyWatching } from "./statsData";
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
    data: Show[];
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const scheme = useScheme();

    const deferredData = useDeferredValue(data, []);
    // Answered once for the page: it decides both whether the "now" strip is rendered and whether
    // the rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const watching = currentlyWatching(data);
    // The phone reads the library before the charts. One answer for the page and the rail alike:
    // `ChartsAndLibrary` orders the two sections and `chartsLastOrder`, inside the sections list,
    // orders the chips naming them.
    const chartsLast = usePhone();
    // Built once for the whole page rather than per shell, off the same figures the rail's own
    // chip states: a chart's further narrowing is not what the message answers for, only the
    // reader's own filters.
    const nothingMatches = isFilteredEmpty(data.length, activeCount(filterState)) ? (
      <NothingMatches onClear={() => filterDispatch({ type: "resetFilters" })} />
    ) : undefined;

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
          empty={nothingMatches}
        />
      </Section>
    );

    return (
      <Stack spacing={2}>
        <PageRail
          sections={showSections(watching.length > 0, chartsLast)}
          count={data.length}
        />
        <Stats
          data={data}
          watching={watching}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          empty={nothingMatches}
        />
        <Section id={SHOW_SECTIONS.timeline}>
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
