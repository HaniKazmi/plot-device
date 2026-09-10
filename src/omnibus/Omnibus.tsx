import { lazy, Suspense, useEffect } from "react";
import { useLibrary } from "../app/library";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";
import { useFilterReducer } from "./filterUtils";
import { upToSlice } from "../common/filterReducer";
import { media } from "../app/types";

/**
 * The one `import()` of the charts, at module scope: the React Compiler cannot lower an import
 * expression, and one written inside a component or hook takes that whole function out of
 * compilation, silently. Both callers below go through this function instead.
 */
const loadGraphs = () => import("./Graphs");

const Graphs = lazy(loadGraphs);

/**
 * Starts the charts' chunk downloading at the tab's first paint, alongside OAuth and the four
 * sheet fetches, rather than after them.
 *
 * `lazy` asks for the chunk only when `Graphs` is first rendered, and nothing renders it until
 * all four sheets have arrived — so on a cold cache several hundred kilobytes of charting queue
 * behind a whole round of authorisation and four full sheet reads. This is the same specifier, so the module registry
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
 * It reads the four libraries the shell already holds, so every row reaches it through exactly the
 * converter, cache key and reviver its home tab uses — there is no fifth copy of any of that to
 * keep in step, and no cache written from here.
 *
 * Nothing renders until all four have arrived. A page comparing four media against each other
 * with one of them missing is not a partial answer but a wrong one: the totals band would report
 * shares of a library three quarters present, and the reader has no way to tell.
 *
 * The union comes from the provider rather than being flattened again here: the Now band elects
 * from the domain records and the charts read the flat list, and two flattenings of one library are
 * two chances to disagree about which rows guest mode hides.
 */
const Omnibus = () => {
  usePrefetchGraphs();
  // The library and the union it was flattened from, both answered above: one is defined exactly
  // when the other is, so the page has a single test for whether all four sheets are here.
  const { whole: library, items: data, loaded, error } = useLibrary();

  const [filterState] = useFilterReducer();

  // The first sheet to complain, not all of them: each message names a row in a different
  // spreadsheet, and four at once would say the page is broken four times over where the
  // reader can only go and fix one of them at a time.
  //
  // This is the tab that needs it most — one bad row in any of the four empties the whole page,
  // and the medium it came from is the first thing to know — so its position among these siblings
  // is fixed whether or not the charts are there. The refresh notice depends on that: all four
  // are announced at once, when the last of them turns up, and a remount at that moment is a
  // remount that sees only the second half of the turn.
  const notice = (
    <DataLoadedSnackbar
      // Walked rather than written out: destructured by hand, a fifth medium is silently absent
      // from both answers and nothing fails to compile over it.
      open={media.every((medium) => loaded[medium])}
      error={media.map((medium) => error[medium]).find((message) => message !== undefined)}
    />
  );

  const filteredData = data?.filter(filterState.filter);

  return (
    <>
      {library && data && filteredData && (
        <Suspense>
          <Graphs
            library={library}
            filteredData={filteredData}
            upToData={upToSlice(data, filteredData, filterState)}
            filterState={filterState}
          />
        </Suspense>
      )}
      {notice}
    </>
  );
};

export default Omnibus;
