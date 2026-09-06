import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { certificateColour, type Movie } from "./types";
import { movieModule } from "./module";
import Finished from "../common/Finished";
import MovieCardMediaImage from "./CardMediaImage";
import Stats from "./Stats";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import WatchTimeline from "./WatchTimeline";
import { ChartPair, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { MOVIE_SECTIONS, movieSections } from "./sections";
import { FranchiseContext, movieFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import type { FilterState } from "./filterUtils";
import { wallPopulation, type FinishedExtraSort } from "../common/finishedData";
import { useScheme } from "../common/useScheme";

const MOVIE_SORTS: readonly FinishedExtraSort<Movie>[] = [{ label: "Score", value: (movie) => movie.score }];

/** What the wall's card borders speak, and the key beneath its header names. */
const MOVIE_BORDER = { key: "certificate", valueOf: (film: Movie) => film.certificate };

const SuspenseBlock = ({
  filteredData,
  unfilteredData,
  filterState,
}: {
  filteredData: Movie[];
  unfilteredData: Movie[];
  filterState: FilterState;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, movieFranchise)}>
    <Graphs
      data={filteredData}
      filterState={filterState}
    />
  </FranchiseContext.Provider>
);

const Graphs = memo(({ data, filterState }: { data: Movie[]; filterState: FilterState }) => {
  const scheme = useScheme();

  const deferredData = useDeferredValue(data, []);

  return (
    <Stack spacing={2}>
      <PageRail
        sections={movieSections(data.length > 0)}
        count={data.length}
      />
      <Stats
        data={data}
        measure={filterState.measure}
        yearType={filterState.yearType}
        yearTo={filterState.yearTo}
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
              yearType={filterState.yearType}
            />
          }
        />
      </Section>
      <Section id={MOVIE_SECTIONS.library}>
        <Finished
          count={wallPopulation(data, movieModule.noun)}
          title="All Films"
          border={MOVIE_BORDER}
          data={data}
          // The certificate rather than genre for the border: `certificateToColour` is validated at convert
          // time and total, so it cannot throw across a wall of hundreds of cards.
          colour={(item) => certificateColour(item, scheme)}
          MediaComponent={MovieCardMediaImage}
          landscape
          // Score is a wall order rather than a strip of its own: "what was best" is the same
          // library read in another order, and the wall is where a whole order can be read.
          sorts={MOVIE_SORTS}
        />
      </Section>
    </Stack>
  );
});

Graphs.displayName = "Graphs";

export default SuspenseBlock;
