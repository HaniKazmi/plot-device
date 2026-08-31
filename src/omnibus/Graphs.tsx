import { memo } from "react";
import type { YearNumber } from "../common/date";
import { Stack } from "@mui/material";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";
import { franchiseIndex } from "../common/franchiseIndex";
import { SectionRail } from "../common/SectionRail";
import { FranchiseContext as MovieFranchiseContext, movieFranchise } from "../movie/franchiseContext";
import { FranchiseContext as ShowFranchiseContext, showFranchise } from "../show/franchiseContext";
import { FranchiseContext as VgFranchiseContext } from "../vg/franchiseContext";
import { useOtherTabs } from "../tabs";
import { earliestYear, electNow, hasNow, type Library, type OmniItem } from "./adapter";
import Filter from "./Filter";
import Stats from "./Stats";
import { omnibusSections } from "./sections";
import type { FilterDispatch, FilterState } from "./filterUtils";

/**
 * The three franchise indexes the domains' own cards read.
 *
 * A card opened from this tab is the domain's card, strip and all, and the strip asks its
 * domain's context for the rest of the series. Without the providers every strip here would hold
 * the one item it was opened from — a wrong answer rather than a missing one. The indexes are
 * built from the guest-filtered libraries, which is the one filter a strip must honour.
 */
const SuspenseBlock = ({
  library,
  filteredData,
  unfilteredData,
  dataLoaded,
  filterState,
  filterDispatch,
}: {
  library: Library;
  filteredData: OmniItem[];
  unfilteredData: OmniItem[];
  dataLoaded: boolean;
  filterState: FilterState;
  filterDispatch: FilterDispatch;
}) => (
  <VgFranchiseContext.Provider value={franchiseIndex(library.games, (game) => game.franchise)}>
    <ShowFranchiseContext.Provider value={franchiseIndex(library.shows, showFranchise)}>
      <MovieFranchiseContext.Provider value={franchiseIndex(library.movies, movieFranchise)}>
        <Graphs
          library={library}
          data={filteredData}
          // The floor of the year select, read from the whole union rather than from what the
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
        <DataLoadedSnackbar open={dataLoaded} />
      </MovieFranchiseContext.Provider>
    </ShowFranchiseContext.Provider>
  </VgFranchiseContext.Provider>
);

const Graphs = memo(
  ({
    library,
    data,
    earliestYear,
    filterState,
    filterDispatch,
  }: {
    library: Library;
    data: OmniItem[];
    earliestYear?: YearNumber;
    filterState: FilterState;
    filterDispatch: FilterDispatch;
  }) => {
    const tabs = useOtherTabs();
    // Answered once for the page: it decides both whether the Now band is rendered and whether the
    // rail offers a chip pointing at it, and two derivations of one test are two that can differ.
    const now = electNow(library, filterState);

    return (
      <Stack spacing={2}>
        <SectionRail
          sections={omnibusSections(hasNow(now))}
          tabs={tabs}
        />
        <Stats
          data={data}
          now={now}
          earliestYear={earliestYear}
          measure={filterState.measure}
          yearType={filterState.yearType}
          yearTo={filterState.yearTo}
          filterDispatch={filterDispatch}
        />
      </Stack>
    );
  },
);

Graphs.displayName = "Graphs";

export default SuspenseBlock;
