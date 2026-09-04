import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { ratingToColour, type Measure, type Movie } from "./types";
import Finished from "../common/Finished";
import MovieCardMediaImage from "./CardMediaImage";
import Stats from "./Stats";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import WatchTimeline from "./WatchTimeline";
import Filter from "./Filter";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { FilterChip } from "../common/FilterDrawer";
import { MeasureControl } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { MOVIE_SECTIONS, movieSections } from "./sections";
import { FranchiseContext, movieFranchise } from "./franchiseContext";
import { visibleFranchiseIndex } from "../common/franchiseIndex";
import { activeCount, guestFilter, type FilterDispatch, type FilterState } from "./filterUtils";
import { format } from "../utils/mathUtils";
import { finishedCount, type FinishedExtraSort } from "../common/finishedData";
import { useScheme } from "../common/useScheme";
import { usePhone } from "../common/breakpoints";

/** The measures this tab counts in, in the order the rail states them. */
const MEASURES: readonly Measure[] = ["Films", "Hours"];

const MOVIE_SORTS: readonly FinishedExtraSort<Movie>[] = [{ label: "Score", value: (movie) => movie.score }];

const SuspenseBlock = ({
  filteredData,
  unfilteredData,
  filterState,
  filterDispatch,
}: {
  filteredData: Movie[];
  unfilteredData: Movie[];
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  <FranchiseContext.Provider
    value={visibleFranchiseIndex(unfilteredData, movieFranchise, filterState.guestMode, guestFilter)}
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
    data: Movie[];
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const scheme = useScheme();

    const deferredData = useDeferredValue(data, []);
    const tabs = useOtherTabs();
    // The phone reads the library before the charts, and the sections are ordered in the DOM
    // rather than with CSS: the rail derives the current section from its own list's order, so a
    // page laid out in one order and listed in another lights the wrong chip on every scroll.
    const chartsLast = usePhone();

    const charts = (
      <Section
        key={MOVIE_SECTIONS.charts}
        id={MOVIE_SECTIONS.charts}
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
        key={MOVIE_SECTIONS.library}
        id={MOVIE_SECTIONS.library}
      >
        <Finished
          title="All Films"
          count={`${format(finishedCount(data))} films`}
          borderKey="rating"
          data={data}
          // Rating rather than genre for the border: `ageRatingToColour` is validated at convert
          // time and total, so it cannot throw across a wall of hundreds of cards.
          colour={(item) => ratingToColour(item, scheme)}
          MediaComponent={MovieCardMediaImage}
          landscape
          // Score is a wall order rather than a strip of its own: "what was best" is the same
          // library read in another order, and the wall is where a whole order can be read.
          sorts={MOVIE_SORTS}
        />
      </Section>
    );

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={movieSections(data.length > 0, chartsLast)}
          tabs={tabs}
          actions={
            <MeasureControl
              measures={MEASURES}
              value={filterState.measure}
              dispatch={filterDispatch}
            />
          }
          trailing={<FilterChip activeCount={activeCount(filterState)} />}
        />
        <Stats
          data={data}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          filterDispatch={filterDispatch}
        />
        <Section id={MOVIE_SECTIONS.timeline}>
          <WatchTimeline data={deferredData} />
        </Section>
        {chartsLast ? [library, charts] : [charts, library]}
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
