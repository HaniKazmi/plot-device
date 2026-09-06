import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import type { Book } from "./types";
import { bookModule } from "./module";
import Finished from "../common/Finished";
import BookCardMediaImage from "./CardMediaImage";
import Stats from "./Stats";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Timeline from "./Timeline";
import { ChartPair, ChartsAndLibrary, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { isFilteredEmpty } from "../common/population";
import { NothingMatches } from "../common/NothingMatches";
import { BOOK_SECTIONS, bookSections } from "./sections";
import { bookEpoch, bookFranchise, BookEpochProvider, FranchiseContext } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import { bookKey, currentlyReading } from "./statsData";
import { wallPopulation, type FinishedExtraSort } from "../common/finishedData";
import { genreToColour } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { usePhone } from "../common/breakpoints";

/**
 * The index and the scale every card strip on the tab reads, both built from the unfiltered data:
 * a strip answers for the whole series whatever the filters left, and a scale that opened where
 * the filtered data began would redraw every card's strip on a filter change.
 */
const BOOK_SORTS: readonly FinishedExtraSort<Book>[] = [
  { label: "Score", value: (book) => book.score },
  // Bucketed by the hundred, and never as a bare four digits, which the rail would read as a
  // year: "700+" is a chip, where every page count would be a chip of its own.
  { label: "Pages", value: (book) => book.pages, bucket: (pages) => `${Math.floor(pages / 100) * 100}+` },
];

/** What the wall's card borders speak, and the key beneath its header names. */
const BOOK_BORDER = { key: "genre", valueOf: (book: Book) => book.genre };

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
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
    </BookEpochProvider>
  </FranchiseContext.Provider>
);

const Graphs = memo(
  ({
    data,
    filterState,
    filterDispatch,
  }: {
    data: Book[];
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const scheme = useScheme();

    const deferredData = useDeferredValue(data, []);
    // Answered once for the page: it decides both whether the hero is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const reading = currentlyReading(data);
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
        key={BOOK_SECTIONS.charts}
        id={BOOK_SECTIONS.charts}
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
        key={BOOK_SECTIONS.library}
        id={BOOK_SECTIONS.library}
      >
        <Finished
          count={wallPopulation(data, bookModule.noun)}
          title="All Books"
          border={BOOK_BORDER}
          data={data}
          // Genre for the border: the ramp answers the neutral off its table and never throws, so
          // it cannot take a wall of hundreds of cards down on one unfamiliar value.
          colour={(item) => genreToColour(item.genre, scheme)}
          // Score and pages are wall orders rather than strips of their own: "what was best"
          // and "what was longest" are the same library read in another order, and the wall is
          // where a whole order can be read.
          sorts={BOOK_SORTS}
          // A reread is a second row with the title and release year of the first, so the wall's
          // own key — the two together — would name both cards alike.
          keyOf={bookKey}
          MediaComponent={BookCardMediaImage}
          empty={nothingMatches}
        />
      </Section>
    );

    return (
      <Stack spacing={2}>
        <PageRail
          sections={bookSections(reading.length > 0, chartsLast)}
          count={data.length}
        />
        <Stats
          data={data}
          reading={reading}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          empty={nothingMatches}
        />
        <Section id={BOOK_SECTIONS.timeline}>
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
