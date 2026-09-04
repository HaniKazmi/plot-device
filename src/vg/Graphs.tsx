import Stats from "./Stats";
import { VideoGame, companyToColor, type Measure } from "./types";
import { useScheme } from "../common/useScheme";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";
import CardMediaImage from "./CardMediaImage";
import { FilterDispatch, FilterState, guestFilter } from "./filterUtils";
import { FranchiseContext, vgFranchise } from "./franchiseContext";
import { visibleFranchiseIndex } from "../common/franchiseIndex";
import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { usePhone } from "../common/usePhone";
import Filter from "./Filter";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { MeasureControl } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { VG_SECTIONS, vgSections } from "./sections";
import { currentlyPlaying, earliestYear } from "./statsData";
import { format } from "../utils/mathUtils";
import { finishedCount } from "../common/finishedData";
import type { YearNumber } from "../common/date";

/** The measures this tab counts in, in the order the rail states them. */
const MEASURES: readonly Measure[] = ["Games", "Hours"];

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
  <FranchiseContext.Provider
    value={visibleFranchiseIndex(unfilteredData, vgFranchise, filterState.guestMode, guestFilter)}
  >
    <Graphs
      data={filteredData}
      // Read from the whole library rather than what the filters left, so picking "In 2020"
      // cannot strand the reader at 2020 by making that year the earliest one on offer.
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
    // The phone reads the library before the charts, and the sections are ordered in the DOM
    // rather than with CSS: the rail derives the current section from its own list's order, so a
    // page laid out in one order and listed in another lights the wrong chip on every scroll.
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
          MediaComponent={CardMediaImage}
          title="All Games"
          count={`${format(finishedCount(data))} games`}
          borderKey="company"
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
              measures={MEASURES}
              value={filterState.measure}
              dispatch={filterDispatch}
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
        {chartsLast ? [library, charts] : [charts, library]}
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
