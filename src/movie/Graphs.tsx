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
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useOtherTabs } from "../tabs";
import { MOVIE_SECTIONS, movieSections } from "./sections";
import { FranchiseContext, movieFranchise } from "./franchiseContext";
import { visibleFranchiseIndex } from "../common/franchiseIndex";
import { guestFilter, type FilterDispatch, type FilterState } from "./filterUtils";
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
  { value: "Films", label: "Films" },
  { value: "Hours", label: "Hours" },
];

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

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={movieSections(data.length > 0)}
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
            colour={(item) => ratingToColour(item, scheme)}
            MediaComponent={MovieCardMediaImage}
          />
        </Section>
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
