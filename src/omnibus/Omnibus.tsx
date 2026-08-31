import { lazy, Suspense } from "react";
import useData from "../common/useData";
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
  const [games, gamesLoaded] = useData(vgDataConfig, VideoGamesTab);
  const [shows, showsLoaded] = useData(showDataConfig, ShowsTab);
  const [movies, moviesLoaded] = useData(movieDataConfig, MoviesTab);

  const [filterState, filterDispatch] = useFilterReducer();

  if (!games || !shows || !movies) {
    return null;
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
        // The snackbar says the page in front of the reader is the fresh one, which it is only
        // once every medium on it has refetched.
        dataLoaded={gamesLoaded && showsLoaded && moviesLoaded}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
    </Suspense>
  );
};

export default Omnibus;
