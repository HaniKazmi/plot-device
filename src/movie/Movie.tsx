import { lazy, Suspense, useEffect } from "react";
import { useLibrary } from "../app/library";
import { useFilterReducer } from "./filterUtils";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";

/**
 * The one `import()` of the charts, at module scope: the React Compiler cannot lower an import
 * expression, and one written inside a component or hook takes that whole function out of
 * compilation, silently. Both callers below go through this function instead.
 */
const loadGraphs = () => import("./Graphs");

const Graphs = lazy(loadGraphs);

/**
 * Starts the charts' chunk downloading at the tab's first paint, alongside OAuth and the sheet
 * fetch, rather than after them.
 *
 * `lazy` asks for the chunk only when `Graphs` is first rendered, and nothing renders it until
 * the sheet has arrived — so on a cold cache several hundred kilobytes of charting queue behind a whole
 * round of authorisation and a full sheet read. This is the same specifier, so the module registry
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

const MovieGraphs = () => {
  usePrefetchGraphs();
  // The tab's own slice of the one library the shell fetched, with guest mode already
  // applied: the mode hides content rather than narrowing a view, so it belongs to the data
  // every surface here reads and not to this page's filters.
  const { visible, loaded, error } = useLibrary();
  const data = visible.movies;

  const [filterState, filterDispatch] = useFilterReducer();

  // Mounted beside the charts rather than inside them, because the case worth saying most is the
  // one where there are none: a reader arriving for the first time against a sheet the converter
  // rejects has nothing below this line, and the message naming the row is all there is to show.
  //
  // Its position among these siblings is fixed for the whole life of the tab, which is what the
  // refresh notice needs: it reports the turn from no data to data, and a remount at that moment
  // is a remount that sees only the second half of it.
  const notice = (
    <DataLoadedSnackbar
      open={loaded.movie}
      error={error.movie}
    />
  );

  return (
    <>
      {data && (
        <Suspense>
          <Graphs
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

export default MovieGraphs;
