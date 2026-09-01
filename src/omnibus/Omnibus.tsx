import { lazy, Suspense } from "react";
import useData from "../common/useData";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";
import { MoviesTab, ShowsTab, VideoGamesTab } from "../tabs";
import { movieDataConfig } from "../movie/converter";
import { showDataConfig } from "../show/converter";
import { vgDataConfig } from "../vg/converter";
import { toOmniItems, visibleLibrary } from "./adapter";
import { useFilterReducer } from "./filterUtils";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

/**
 * The one tab with no sheet of its own.
 *
 * It mounts the three domains' own data configurations, so every row reaches it through exactly
 * the converter, cache key and reviver its home tab uses — there is no fourth copy of any of that
 * to keep in step, and no cache written from here.
 *
 * Nothing renders until all three have arrived. A page comparing three media against each other
 * with one of them missing is not a partial answer but a wrong one: the totals band would report
 * shares of a library two thirds present, and the reader has no way to tell.
 */
const Omnibus = () => {
  const [games, gamesLoaded, gamesError] = useData(vgDataConfig, VideoGamesTab);
  const [shows, showsLoaded, showsError] = useData(showDataConfig, ShowsTab);
  const [movies, moviesLoaded, moviesError] = useData(movieDataConfig, MoviesTab);

  const [filterState, filterDispatch] = useFilterReducer();

  // The first sheet to complain, not all of them: each message names a row in a different
  // spreadsheet, and three at once would say the page is broken three times over where the
  // reader can only go and fix one of them at a time.
  //
  // Mounted before the guard below, which is where this tab needs it most — one bad row in any of
  // the three empties the whole page, and the medium it came from is the first thing to know.
  const notice = (
    <DataLoadedSnackbar
      open={gamesLoaded && showsLoaded && moviesLoaded}
      error={gamesError ?? showsError ?? moviesError}
    />
  );

  if (!games || !shows || !movies) {
    return notice;
  }

  // Guest mode is applied per library, by each domain's own rule, before anything is composed:
  // the Now band elects from these records rather than from the union, so a predicate applied
  // only to the union would let it headline a title the charts had hidden.
  const library = visibleLibrary({ games, shows, movies }, filterState.guestMode);
  const data = toOmniItems(library);

  return (
    <Suspense>
      <Graphs
        library={library}
        filteredData={data.filter(filterState.filter)}
        unfilteredData={data}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
      {notice}
    </Suspense>
  );
};

export default Omnibus;
