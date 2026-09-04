import { Stack } from "@mui/material";
import { usePhone } from "../common/usePhone";
import type { YearNumber } from "../common/date";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { MeasureControl } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { SHOW_SECTIONS, showSections } from "./sections";
import { currentlyWatching, earliestYear } from "./statsData";
import Timeline from "./Timeline";
import { Show, type Measure } from "./types";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import { guestFilter, type FilterDispatch, type FilterState } from "./filterUtils";
import { FranchiseContext, showFranchise } from "./franchiseContext";
import { visibleFranchiseIndex } from "../common/franchiseIndex";
import Filter from "./Filter";
import { memo, useDeferredValue } from "react";
import { format } from "../utils/mathUtils";
import { finishedCount } from "../common/finishedData";
import { useScheme } from "../common/useScheme";

/** The measures this tab counts in, in the order the rail states them. */
const MEASURES: readonly Measure[] = ["Seasons", "Episodes", "Hours"];

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
  <FranchiseContext.Provider
    value={visibleFranchiseIndex(unfilteredData, showFranchise, filterState.guestMode, guestFilter)}
  >
    <Graphs
      data={filteredData}
      // The floor of the year select, read from the whole library rather than from what the
      // filters left: derived from the filtered data, picking "In 2020" would leave 2020 the
      // earliest year on offer and strand the reader in it.
      earliestYear={earliestYear(unfilteredData)}
      filterState={filterState}
      filterDispatch={filterDispatch}
    />
    <Filter
      state={filterState}
      dispatch={filterDispatch}
      data={unfilteredData}
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
    // The phone reads the library before the charts, and the sections are ordered in the DOM
    // rather than with CSS: the rail derives the current section from its own list's order, so a
    // page laid out in one order and listed in another lights the wrong chip on every scroll.
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
          title="All Shows"
          count={`${format(finishedCount(data))} shows`}
          borderKey="status"
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
          actions={
            <MeasureControl
              measures={MEASURES}
              value={filterState.measure}
              dispatch={filterDispatch}
            />
          }
        />
        <Stats
          data={data}
          watching={watching}
          earliestYear={earliestYear}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          filterDispatch={filterDispatch}
        />
        <Section id={SHOW_SECTIONS.timeline}>
          <Timeline data={deferredData} />
        </Section>
        {chartsLast ? [library, charts] : [charts, library]}
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
