import { Stack } from "@mui/material";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { SHOW_SECTIONS, showSections } from "./sections";
import { currentlyWatching } from "./statsData";
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

/**
 * The unit every figure on the tab is counted in, stated as words in the rail rather than as an
 * unlabelled icon on a floating button. It rides the rail because it governs the whole page rather
 * than any one card, and the rail is the only control surface still on screen wherever the reader
 * has scrolled to.
 */
const MEASURES: SegmentOption<Measure>[] = [
  { value: "Episodes", label: "Episodes" },
  { value: "Hours", label: "Hours" },
];

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
    filterState,
    filterDispatch,
  }: {
    data: Show[];
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const scheme = useScheme();

    const deferredData = useDeferredValue(data, []);
    const tabs = useOtherTabs();
    // Answered once for the page: it decides both whether the "now" strip is rendered and whether
    // the rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const watching = currentlyWatching(data);

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={showSections(watching.length > 0)}
          tabs={tabs}
          actions={
            <SegmentedControl
              options={MEASURES}
              value={filterState.measure}
              onChange={(measure) => filterDispatch({ type: "measure", measure })}
              ariaLabel="Measure"
            />
          }
        />
        <Stats
          data={data}
          watching={watching}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          filterDispatch={filterDispatch}
        />
        <Section id={SHOW_SECTIONS.timeline}>
          <Timeline data={deferredData} />
        </Section>
        <Section id={SHOW_SECTIONS.charts}>
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
              />
            }
          />
        </Section>
        <Section id={SHOW_SECTIONS.library}>
          <Finished
            title="All Shows"
            count={`${format(finishedCount(data))} shows`}
            data={data}
            width={3}
            colour={(item) => statusToColour(item, scheme)}
            MediaComponent={ShowCardMediaImage}
          />
        </Section>
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
