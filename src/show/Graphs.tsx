import { Stack } from "@mui/material";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { ChartPair, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { SHOW_SECTIONS, showSections } from "./sections";
import { currentlyWatching } from "./statsData";
import Timeline from "./Timeline";
import { Show } from "./types";
import { showModule } from "./module";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import type { FilterState } from "./filterUtils";
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
}: {
  filteredData: Show[];
  unfilteredData: Show[];
  filterState: FilterState;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, showFranchise)}>
    <Graphs
      data={filteredData}
      filterState={filterState}
    />
  </FranchiseContext.Provider>
);

const Graphs = memo(({ data, filterState }: { data: Show[]; filterState: FilterState }) => {
  const scheme = useScheme();

  const deferredData = useDeferredValue(data, []);
  // Answered once for the page: it decides both whether the "now" strip is rendered and whether
  // the rail offers a chip pointing at it, and two derivations of one test are two that can differ.
  const watching = currentlyWatching(data);

  return (
    <Stack spacing={2}>
      <PageRail
        sections={showSections(watching.length > 0)}
        count={data.length}
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
              yearType={filterState.yearType}
            />
          }
        />
      </Section>
      <Section id={SHOW_SECTIONS.library}>
        <Finished
          count={wallPopulation(data, showModule.noun)}
          title="All Shows"
          border={SHOW_BORDER}
          data={data}
          colour={(item) => statusToColour(item, scheme)}
          MediaComponent={ShowCardMediaImage}
        />
      </Section>
    </Stack>
  );
});

Graphs.displayName = "Graphs";

export default SuspenseBlock;
