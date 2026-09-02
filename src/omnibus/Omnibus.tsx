import { lazy, Suspense, useEffect } from "react";
import useData from "../common/useData";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";
import { MoviesTab, ShowsTab, VideoGamesTab } from "../tabs";
import { movieDataConfig } from "../movie/converter";
import { showDataConfig } from "../show/converter";
import { vgDataConfig } from "../vg/converter";
import { toOmniItems, visibleLibrary } from "./adapter";
import { useFilterReducer } from "./filterUtils";

/**
 * The one `import()` of the charts, at module scope: the React Compiler cannot lower an import
 * expression, and one written inside a component or hook takes that whole function out of
 * compilation, silently. Both callers below go through this function instead.
 */
const loadGraphs = () => import("./Graphs");

const Graphs = lazy(loadGraphs);

/**
 * Starts the charts' chunk downloading at the tab's first paint, alongside OAuth and the three
 * sheet fetches, rather than after them.
 *
 * `lazy` asks for the chunk only when `Graphs` is first rendered, and nothing renders it until
 * all three sheets have arrived — so on a cold cache several hundred kilobytes of charting queue
 * behind a whole round of authorisation and three full sheet reads. This is the same specifier, so the module registry
 * hands `lazy` whatever this call already has in flight rather than fetching twice, and `lazy` is
 * still what surfaces a failed load to the reader: the handler here only keeps the head start from
 * counting as an unhandled rejection while nothing is subscribed.
 *
 * The request is made from an effect rather than at module scope because `tabs.ts` imports every
 * tab's entry component eagerly. At module scope this downloads all four domains' charts on any
 * visit, and pulls Highcharts into the node test process along with them.
 */
const usePrefetchGraphs = () =>
  useEffect(() => {
    void loadGraphs().catch(() => {});
  }, []);

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
  usePrefetchGraphs();
  const [games, gamesLoaded, gamesError] = useData(vgDataConfig, VideoGamesTab);
  const [shows, showsLoaded, showsError] = useData(showDataConfig, ShowsTab);
  const [movies, moviesLoaded, moviesError] = useData(movieDataConfig, MoviesTab);

  const [filterState, filterDispatch] = useFilterReducer();

  // Guest mode is applied per library, by each domain's own rule, before anything is composed:
  // the Now band elects from these records rather than from the union, so a predicate applied
  // only to the union would let it headline a title the charts had hidden.
  const library =
    games && shows && movies ? visibleLibrary({ games, shows, movies }, filterState.guestMode) : undefined;
  const data = library && toOmniItems(library);

  // The first sheet to complain, not all of them: each message names a row in a different
  // spreadsheet, and three at once would say the page is broken three times over where the
  // reader can only go and fix one of them at a time.
  //
  // This is the tab that needs it most — one bad row in any of the three empties the whole page,
  // and the medium it came from is the first thing to know — so its position among these siblings
  // is fixed whether or not the charts are there. The refresh notice depends on that: all three
  // are announced at once, when the last of them turns up, and a remount at that moment is a
  // remount that sees only the second half of the turn.
  const notice = (
    <DataLoadedSnackbar
      open={gamesLoaded && showsLoaded && moviesLoaded}
      error={gamesError ?? showsError ?? moviesError}
    />
  );

  return (
    <>
      {library && data && (
        <Suspense>
          <Graphs
            library={library}
            filteredData={data.filter(filterState.filter)}
            unfilteredData={data}
            filterState={filterState}
            filterDispatch={filterDispatch}
          />
        </Suspense>
      )}
      {notice}
    </>
  );
};

export default Omnibus;
