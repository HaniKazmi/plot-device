import { Suspense, useEffect, type ComponentType } from "react";
import { DataLoadedSnackbar } from "../common/DataLoadedSnackbar";
import type { FilterDispatchFor } from "../common/filterReducer";
import type { Medium, Predicate } from "../utils/types";
import { useLibrary } from "./library";

/** What every tab's `Graphs` takes: its own rows, filtered and whole, and the state that narrowed them. */
interface TabGraphsProps<T, S> {
  filteredData: T[];
  unfilteredData: T[];
  filterState: S;
  filterDispatch: FilterDispatchFor<S>;
}

/**
 * Starts the charts' chunk downloading at the tab's first paint, alongside OAuth and the sheet
 * fetch, rather than after them.
 *
 * `lazy` asks for the chunk only when `Graphs` is first rendered, and nothing renders it until the
 * sheet has arrived — so on a cold cache several hundred kilobytes of charting queue behind a
 * whole round of authorisation and a full sheet read. The specifier is the domain's own, so the
 * module registry hands `lazy` whatever this call already has in flight rather than fetching
 * twice, and `lazy` is still what surfaces a failed load to the reader: the handler here only
 * keeps the head start from counting as an unhandled rejection while nothing is subscribed.
 *
 * The request is made from an effect rather than at module scope because `tabs.ts` imports every
 * tab's entry component eagerly. At module scope this downloads all four domains' charts on any
 * visit, and pulls Highcharts into the node test process along with them.
 */
const usePrefetchGraphs = (loadGraphs: () => Promise<unknown>) =>
  useEffect(() => {
    void loadGraphs().catch(() => {});
  }, [loadGraphs]);

/**
 * A tracked tab's entry component: its slice of the library, its filter state, its charts and the
 * notice that says what the sheet had to say.
 *
 * One factory rather than four files, because what a home tab actually varies is its medium, its
 * charts and the store its state lives in — everything around those is the same page, and four
 * copies of it are four places for the snackbar's position or the guest-mode rule to drift.
 *
 * The two pieces a domain keeps for itself are the `import()` of its charts and the `lazy()` over
 * it: the React Compiler cannot lower an import expression, so one written here — or anywhere
 * inside a component — would take that whole function out of compilation, silently.
 */
export const createTabEntry = <T, S extends { filter: Predicate<T> }>({
  medium,
  loadGraphs,
  Graphs,
  useFilterReducer,
}: {
  medium: Medium;
  loadGraphs: () => Promise<unknown>;
  Graphs: ComponentType<TabGraphsProps<T, S>>;
  useFilterReducer: () => readonly [S, FilterDispatchFor<S>];
}) => {
  const TabEntry = () => {
    usePrefetchGraphs(loadGraphs);
    // The tab's own slice of the one library the shell fetched, with guest mode already applied:
    // the mode hides content rather than narrowing a view, so it belongs to the data every surface
    // here reads and not to this page's filters. The library is keyed by medium and its element
    // types erase to nothing a caller holding a bare `Medium` can name, so the slice is cast back
    // to the records this tab's own charts are typed for — the erasure `LibraryProvider` pays
    // going in, read back out.
    const { visible, loaded, error } = useLibrary();
    const data = visible[medium] as T[] | undefined;
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
        open={loaded[medium]}
        error={error[medium]}
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

  return TabEntry;
};
