import { lazy, Suspense, useEffect } from "react";
import useData from "../common/useData";
import { BooksTab } from "../tabs";
import { bookDataConfig } from "./converter";
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
  const [data, dataLoaded, error] = useData(bookDataConfig, BooksTab);

  const [filterState, filterDispatch] = useFilterReducer();

  // Mounted beside the charts rather than inside them, because the case worth saying most is the
  // one where there are none: a reader arriving for the first time against a sheet the converter
  // rejects has nothing below this line, and the message naming the row is all there is to show.
  const notice = (
    <DataLoadedSnackbar
      open={dataLoaded}
      error={error}
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
