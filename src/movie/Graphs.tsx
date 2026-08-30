import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { ratingToColour, type Movie } from "./types";
import Finished from "../common/Finished";
import MovieCardMediaImage from "./CardMediaImage";
import Stats from "./Stats";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import WatchTimeline from "./WatchTimeline";
import Filter from "./Filter";
import { ChartPair, Section, SectionRail } from "../common/SectionRail";
import { MOVIE_SECTIONS, movieSections } from "./sections";
import { FranchiseContext, movieFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";
import { guestFilter, type FilterDispatch, type FilterState } from "./filterUtils";
import { format } from "../utils/mathUtils";
import { finishedCount } from "../common/finishedData";

const SuspenseBlock = ({
  filteredData,
  unfilteredData,
  dataLoaded,
  filterState,
  filterDispatch,
}: {
  filteredData: Movie[];
  unfilteredData: Movie[];
  dataLoaded: boolean;
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  // Built from the unfiltered data, because a card's franchise strip is about the series and not
  // about the current view — filtering to one genre would otherwise amputate it. Guest mode is
  // the exception: it hides content rather than narrowing a view, so it is applied here too.
  <FranchiseContext.Provider
    value={franchiseIndex(filterState.guestMode ? unfilteredData.filter(guestFilter) : unfilteredData, movieFranchise)}
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
    <DataLoadedSnackbar open={dataLoaded} />
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
    const deferredData = useDeferredValue(data, []);

    return (
      <Stack spacing={2}>
        <SectionRail sections={movieSections(data.length > 0)} />
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
        <Section id={MOVIE_SECTIONS.charts}>
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
        <Section id={MOVIE_SECTIONS.library}>
          <Finished
            title="All Movies"
            count={`${format(finishedCount(data))} films`}
            data={data}
            width={3}
            // Rating rather than genre for the border: `ageRatingToColour` is validated at convert
            // time and total, so it cannot throw across a wall of hundreds of cards.
            colour={ratingToColour}
            MediaComponent={MovieCardMediaImage}
          />
        </Section>
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
