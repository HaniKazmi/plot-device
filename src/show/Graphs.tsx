import { Stack } from "@mui/material";
import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Sunburst from "./Sunburst";
import Stats from "./Stats";
import { ChartPair, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { SHOW_SECTIONS, showSections } from "./sections";
import { currentlyWatching, heroSeason } from "./statsData";
import Timeline from "./Timeline";
import { networkToColour, Show } from "./types";
import { showModule } from "./module";
import { ShowShelfCardMediaImage } from "./CardMediaImage";
import { seasonSplit, shelfKey, showShelfItem, type ShowShelfItem } from "./cardData";
import { statusToColour, type Scheme } from "../utils/types";
import { seasonInScope, type FilterState } from "./filterUtils";
import { FranchiseContext, showFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { memo, useDeferredValue } from "react";
import { genreShelf, wallPopulation, type FinishedExtraSort } from "../common/finishedData";
import { useScheme } from "../common/useScheme";

/** What the wall's card borders speak, and the key beneath its header names. */
const SHOW_BORDER = { key: "status", valueOf: ({ show }: ShowShelfItem) => show.status };

/**
 * What the library can be shelved by beyond When and Franchise. A network off the brand table
 * answers no colour, so its shelf carries no swatch rather than the neutral.
 */
const showShelves = (scheme: Scheme): readonly FinishedExtraSort<ShowShelfItem>[] => [
  genreShelf(scheme),
  {
    label: "Network",
    word: ({ show }) => show.network,
    colour: (network) => networkToColour({ network }, scheme) || undefined,
  },
];

const SuspenseBlock = ({
  filteredData,
  upToData,
  unfilteredData,
  filterState,
}: {
  filteredData: Show[];
  upToData: Show[];
  unfilteredData: Show[];
  filterState: FilterState;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, showFranchise)}>
    <Graphs
      data={filteredData}
      upTo={upToData}
      filterState={filterState}
    />
  </FranchiseContext.Provider>
);

const Graphs = memo(({ data, upTo, filterState }: { data: Show[]; upTo: Show[]; filterState: FilterState }) => {
  const scheme = useScheme();

  const deferredData = useDeferredValue(data, []);
  // Answered once for the page: between them they decide what the "now" section holds and whether
  // the rail offers a chip pointing at it, and two derivations of one test are two that can differ.
  // The hero and the strip are separate questions — what was watched last, and what is in flight —
  // so a page can hold either without the other.
  const watching = currentlyWatching(data);
  const hero = heroSeason(data);
  const hasNow = hero !== undefined || watching.length > 0;

  return (
    <Stack spacing={2}>
      <PageRail
        sections={showSections(hasNow)}
        count={data.length}
      />
      <Stats
        data={data}
        upTo={upTo}
        hasNow={hasNow}
        hero={hero}
        watching={watching}
        measure={filterState.measure}
        yearType={filterState.yearType}
        yearTo={filterState.yearTo}
      />
      <Section id={SHOW_SECTIONS.timeline}>
        <Timeline
          data={deferredData}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
        />
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
          data={data.map(showShelfItem)}
          // A season wears its show's status: the sheet records one per show.
          colour={({ show }) => statusToColour(show, scheme)}
          sorts={showShelves(scheme)}
          keyOf={shelfKey}
          unit={seasonSplit(seasonInScope(filterState))}
          shape="poster"
          MediaComponent={ShowShelfCardMediaImage}
        />
      </Section>
    </Stack>
  );
});

Graphs.displayName = "Graphs";

export default SuspenseBlock;
