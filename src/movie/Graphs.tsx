import { memo, useDeferredValue } from "react";
import { Stack } from "@mui/material";
import { cinemaLabel, cinemaToColour, watchedOn, type Movie } from "./types";
import { genreToColour, type Scheme } from "../utils/types";
import { movieModule } from "./module";
import Finished from "../common/Finished";
import MovieCardMediaImage from "./CardMediaImage";
import Stats from "./Stats";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Timeline from "./Timeline";
import { ChartPair, Section } from "../common/SectionRail";
import { PageRail } from "../app/PageRail";
import { MOVIE_SECTIONS, movieSections } from "./sections";
import { FranchiseContext, movieFranchise } from "./franchiseContext";
import { franchiseIndex } from "../common/franchiseIndex";
import type { FilterState } from "./filterUtils";
import {
  franchiseGroup,
  genreShelf,
  wallPopulation,
  type FinishedExtraSort,
  type FinishedUnit,
} from "../common/finishedData";
import { useScheme } from "../common/useScheme";

/**
 * What the library can be shelved by beyond When and Franchise. Score is a figure rather than a
 * strip of its own: "what was best" is the same library read in another order, and the library is
 * where a whole order can be read.
 */
const movieShelves = (scheme: Scheme): readonly FinishedExtraSort<Movie>[] => [
  genreShelf(scheme),
  { label: "Where watched", word: cinemaLabel, colour: (label) => cinemaToColour(label, scheme) },
  { label: "Score", value: (movie) => movie.score },
];

/** What the wall's card borders speak, and the key beneath its header names. */
const MOVIE_BORDER = { key: "genre", valueOf: (film: Movie) => film.genre };

/**
 * A franchise as one card: Marvel stands once on a shelf rather than as forty-four banners. The
 * franchise column and not the series one, which the sheet leaves blank on every film; a film
 * standing alone names itself there and keeps a card of its own.
 */
const MOVIE_UNIT: FinishedUnit<Movie> = {
  labels: ["Films", "Franchises"],
  of: franchiseGroup,
};

const SuspenseBlock = ({
  filteredData,
  upToData,
  unfilteredData,
  filterState,
}: {
  filteredData: Movie[];
  upToData: Movie[];
  unfilteredData: Movie[];
  filterState: FilterState;
}) => (
  <FranchiseContext.Provider value={franchiseIndex(unfilteredData, movieFranchise)}>
    <Graphs
      data={filteredData}
      upTo={upToData}
      filterState={filterState}
    />
  </FranchiseContext.Provider>
);

const Graphs = memo(({ data, upTo, filterState }: { data: Movie[]; upTo: Movie[]; filterState: FilterState }) => {
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
        upTo={upTo}
        measure={filterState.measure}
        yearType={filterState.yearType}
        yearTo={filterState.yearTo}
      />
      <Section id={MOVIE_SECTIONS.timeline}>
        <Timeline
          data={deferredData}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
        />
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
          // Genre, the timeline's own colour to start, so the chart and the library open on one
          // key. The ramp answers the neutral off its table and never throws, so it cannot take a
          // wall of hundreds of cards down on one unfamiliar value.
          colour={(item) => genreToColour(item.genre, scheme)}
          MediaComponent={MovieCardMediaImage}
          landscape
          sorts={movieShelves(scheme)}
          closeOf={watchedOn}
          unit={MOVIE_UNIT}
        />
      </Section>
    </Stack>
  );
});

Graphs.displayName = "Graphs";

export default SuspenseBlock;
