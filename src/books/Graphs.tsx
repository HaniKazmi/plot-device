import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import type { YearNumber } from "../common/date";
import type { Book } from "./types";
import Finished from "../common/Finished";
import BookCardMediaImage from "./CardMediaImage";
import Stats from "./Stats";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Timeline from "./Timeline";
import Filter from "./Filter";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { useOtherTabs } from "../tabs";
import { BOOK_SECTIONS, bookSections } from "./sections";
import { bookEpoch, bookFranchise, BookEpochProvider, FranchiseContext } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import type { FilterDispatch, FilterState } from "./filterUtils";
import { bookKey, currentlyReading, earliestYear } from "./statsData";
import { format } from "../utils/mathUtils";
import { finishedCount } from "../common/finishedData";
import { genreToColour } from "../utils/types";
import { useScheme } from "../common/useScheme";

/**
 * The index and the scale every card strip on the tab reads, both built from the unfiltered data:
 * a strip answers for the whole series whatever the filters left, and a scale that opened where
 * the filtered data began would redraw every card's strip on a filter change.
 */
const SuspenseBlock = ({
  filteredData,
  unfilteredData,
  filterState,
  filterDispatch,
}: {
  filteredData: Book[];
  unfilteredData: Book[];
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, bookFranchise)}>
    <BookEpochProvider value={bookEpoch(unfilteredData)}>
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
    </BookEpochProvider>
  </FranchiseContext.Provider>
);

const Graphs = memo(
  ({
    data,
    earliestYear,
    filterState,
    filterDispatch,
  }: {
    data: Book[];
    earliestYear: YearNumber;
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const scheme = useScheme();

    const deferredData = useDeferredValue(data, []);
    const tabs = useOtherTabs();
    // Answered once for the page: it decides both whether the hero is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const reading = currentlyReading(data);

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={bookSections(reading.length > 0)}
          tabs={tabs}
        />
        <Stats
          data={data}
          reading={reading}
          earliestYear={earliestYear}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          filterDispatch={filterDispatch}
        />
        <Section id={BOOK_SECTIONS.timeline}>
          <Timeline data={deferredData} />
        </Section>
        <Section id={BOOK_SECTIONS.charts}>
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
        <Section id={BOOK_SECTIONS.library}>
          <Finished
            title="All Books"
            count={`${format(finishedCount(data))} books`}
            data={data}
            width={3}
            // Genre for the border: the ramp answers the neutral off its table and never throws, so
            // it cannot take a wall of hundreds of cards down on one unfamiliar value.
            colour={(item) => genreToColour(item.genre, scheme)}
            // A reread is a second row with the title and release year of the first, so the wall's
            // own key — the two together — would name both cards alike.
            keyOf={bookKey}
            MediaComponent={BookCardMediaImage}
          />
        </Section>
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
