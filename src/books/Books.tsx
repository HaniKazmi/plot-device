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
 * fetch, rather than after them — the same head start every other tab's entry takes, for the
 * reason given in `movie/Movie.tsx`.
 */
const usePrefetchGraphs = () =>
  useEffect(() => {
    void loadGraphs().catch(() => {});
  }, []);

const BookGraphs = () => {
  usePrefetchGraphs();
  // The tab's own slice of the one library the shell fetched, with guest mode already
  // applied: the mode hides content rather than narrowing a view, so it belongs to the data
  // every surface here reads and not to this page's filters.
  const { visible, loaded, error } = useLibrary();
  const data = visible.books;

  const [filterState, filterDispatch] = useFilterReducer();

  // Mounted beside the charts rather than inside them, because the case worth saying most is the
  // one where there are none: a reader arriving for the first time against a sheet the converter
  // rejects has nothing below this line, and the message naming the row is all there is to show.
  const notice = (
    <DataLoadedSnackbar
      open={loaded.book}
      error={error.book}
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

export default BookGraphs;
