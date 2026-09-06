import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { ratingToColour, type Movie } from "./types";
import { movieModule } from "./module";
import Finished from "../common/Finished";
import MovieCardMediaImage from "./CardMediaImage";
import Stats from "./Stats";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import WatchTimeline from "./WatchTimeline";
import { SchemaFilterDrawer } from "../common/FilterControls";
import { movieFilters } from "./filters";
import { filterIcons } from "./filterIcons";
import { ChartPair, ChartsAndLibrary, Section, SectionRail } from "../common/SectionRail";
import { FilterChip } from "../common/FilterDrawer";
import { stated } from "../common/population";
import { MeasureControl } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { MOVIE_SECTIONS, movieSections } from "./sections";
import { FranchiseContext, movieFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import { wallPopulation, type FinishedExtraSort } from "../common/finishedData";
import { useScheme } from "../common/useScheme";
import { usePhone } from "../common/breakpoints";

const MOVIE_SORTS: readonly FinishedExtraSort<Movie>[] = [{ label: "Score", value: (movie) => movie.score }];

/** What the wall's card borders speak, and the key beneath its header names. */
const MOVIE_BORDER = { key: "rating", valueOf: (film: Movie) => film.rating };

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
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, movieFranchise)}>
    <Graphs
      data={filteredData}
      filterState={filterState}
      filterDispatch={filterDispatch}
    />
    <SchemaFilterDrawer
      schema={movieFilters}
      icons={filterIcons}
      state={filterState}
      dispatch={filterDispatch}
      data={unfilteredData}
      activeCount={activeCount(filterState)}
      onReset={() => filterDispatch({ type: "resetFilters" })}
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
    // The phone reads the library before the charts. One answer for the page and the rail alike:
    // `ChartsAndLibrary` orders the two sections and `chartsLastOrder`, inside the sections list,
    // orders the chips naming them.
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
          count={wallPopulation(data, movieModule.noun)}
          title="All Films"
          border={MOVIE_BORDER}
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
              measures={movieModule.measures}
              value={filterState.measure}
              dispatch={filterDispatch}
            />
          }
          trailing={
            <FilterChip
              label={stated(data.length, movieModule.noun)}
              activeCount={activeCount(filterState)}
            />
          }
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
