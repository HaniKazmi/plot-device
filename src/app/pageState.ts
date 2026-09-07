import { useSyncExternalStore } from "react";
import type { YearNumber } from "../common/date";
import type { PageDispatch, PageState, PageStore } from "../common/filterReducer";
import { categoryValues, fieldsOf, type CategoryContext, type PageSchema } from "../common/filterSchema";
import { seriesFranchises } from "./galleryData";
import type { PageModule } from "../common/medium";
import { omniPageModule } from "../omnibus/pageModule";
import type { LibraryValue } from "./library";
import { eachMedium } from "./media";
import type { Medium } from "../utils/types";

/**
 * The two halves of the library a page's own rows come out of: each medium's visible slice, and
 * the union across all four. Taken as the pair rather than the whole value, so the sweep that runs
 * whenever a sheet lands can be called before the provider has built the value it hands down.
 */
export type PageRows = Pick<LibraryValue, "visible" | "items">;

/**
 * One tab as a page, plus the one answer the tab itself cannot give: which rows of what the shell
 * fetched are its own. A medium's are its visible slice, the composing tab's are the union — and a
 * `MediumModule` cannot say so, `library` being a shape in this folder and a domain module reaching
 * for it a cycle.
 */
type PageEntry = PageModule & {
  rows(library: PageRows): readonly unknown[] | undefined;
  /**
   * The medium whose tab this is, absent for the composing tab, which is a page and no medium.
   *
   * Declared rather than derived: `eachMedium` holds it while it builds the entry below, where a
   * reader asking later has only a tab id and has to search the registry back for it. It is the
   * one thing telling a library's own tab from the tab over all four, which is a question the
   * union's counts, the shelf's own size and a chip's dot each have to ask.
   */
  medium?: Medium;
};

/**
 * Every tab as a page, by tab id.
 *
 * Keyed by tab and not by medium, because the composing tab is a page with filters, a measure and
 * a scope like any other and is no medium at all. Each entry is that tab's own module — created
 * beside the reducer that owns its initial state — so this is a lookup and never a second
 * declaration of what a tab holds, and every surface standing above the tabs reads one shape
 * whichever page it is over.
 *
 * Every tab has an entry, which is what lets `usePageState` read one unconditionally — a hook
 * cannot be skipped for a tab that has none, and `tests/app/pageState.test.ts` pins the map
 * against the tabs themselves.
 */
export const PAGE_MODULES: Record<string, PageEntry> = Object.fromEntries([
  ...eachMedium((medium, module): [string, PageEntry] => [
    module.tabId,
    // The pairing is the registry's own: the slice is held under exactly the key the module was
    // looked up by, so the rows a page draws are the rows its own filters were written against.
    // `medium` rides in on the spread, `MediumModule` carrying it.
    { ...module, rows: (library) => library.visible[medium] },
  ]),
  [omniPageModule.tabId, { ...omniPageModule, rows: (library: PageRows) => library.items }],
]);

/** The same map read for the one thing a surface setting a filter on another tab needs. */
export const PAGE_STORES: Record<string, PageStore> = Object.fromEntries(
  Object.entries(PAGE_MODULES).map(([tabId, page]) => [tabId, page.pageState]),
);

/**
 * One page's selections held to the vocabulary its own controls are drawing.
 *
 * A category holding nothing is skipped before its options are asked for: `categoryValues` is a
 * pass over the whole library per category, and this runs for all five tabs each time a sheet
 * lands, where the common case is a reader who has selected nothing anywhere. Nothing held is
 * nothing to drop, so the skip changes no answer.
 */
const retainSelections = (
  store: PageStore,
  schema: PageSchema,
  data: readonly unknown[],
  context: () => CategoryContext | undefined,
) => {
  const fields = fieldsOf(store.get());

  for (const category of schema.categories) {
    const held = fields[category.key] as readonly string[] | undefined;
    if (!held?.length) continue;
    store.dispatch({ type: "retain", category: category.key, values: categoryValues(category, data, context()) });
  }
};

/**
 * Every tab's multi-selects held to the values its own library still offers.
 *
 * A category's options are computed over the visible library, so guest mode switched on under a
 * chosen franchise leaves that franchise selected in the store while the select no longer lists it:
 * the page narrows to nothing and there is no chip anywhere to take the choice back. Swept per tab
 * against exactly the rows that tab's own controls draw their lists from, which is what each page
 * answers `rows` with.
 *
 * A slice still in flight is skipped rather than swept against nothing: on a cold cache a library
 * is absent until its sheet lands, and an empty list would clear every selection the reader made.
 * The series set is the same case one level up — it is the union's answer, and the union is
 * `undefined` until all four have landed, so the context is left off rather than passed empty and
 * each picker falls back to its own rows. That fallback is the narrower list, so nothing a page
 * legitimately held before the fourth sheet is swept once it arrives.
 *
 * Built behind that same skip and at most once for the five pages: it is a walk of the whole union,
 * and this runs on every sheet landing where the common case is a reader who has selected nothing
 * anywhere and no category ever asks for it.
 */
export const retainPageSelections = (library: PageRows) => {
  let context: CategoryContext | undefined;
  const contextOf = () => {
    if (!context && library.items) context = { series: seriesFranchises(library.items) };
    return context;
  };

  for (const page of Object.values(PAGE_MODULES)) {
    const rows = page.rows(library);
    if (rows) retainSelections(page.pageState, page.filters, rows, contextOf);
  }
};

/**
 * One tab's state and its dispatch, for a surface that holds a tab id rather than a domain: the
 * rail above the page, and anything setting a filter on a tab it is not standing inside.
 *
 * The store is subscribed to directly rather than through its own `useValue`, so the hook call is
 * a plain one the React Compiler can see through rather than a method on a value looked up here.
 */
export const usePageState = (tabId: string): readonly [PageState, PageDispatch] => {
  const store = PAGE_STORES[tabId];
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);

  return [state, store.dispatch];
};

/**
 * Everything a surface standing above the tabs needs to draw one tab's own controls: what it can
 * be narrowed by, where that narrowing is held, what it counts in, the word it counts, the rows
 * its lists are built from, and the floor its year picker offers.
 *
 * The box that filters a page is mounted above the router and holds a tab id, not a domain — so
 * the five answers are looked up here, in the one file in this folder that may name the composing
 * tab, and the box never learns that four of the five come from a `MediumModule` and one does not.
 *
 * `data` is the tab's own rows with guest mode already applied, which is exactly what that tab's
 * entry component hands its charts: a population stated from anything else would disagree with the
 * figure the rail's own chip states for the same page.
 *
 * `undefined` while a tab's sheet is still in flight — a control surface over an empty library
 * offers no values and a population of zero, where drawing nothing says the page is still landing.
 */
export interface PageSurface {
  schema: PageSchema;
  store: PageStore;
  measures: readonly string[];
  noun: string;
  data: readonly unknown[];
  earliestYear: YearNumber;
}

/**
 * How many rows a page's own settings have left it, for the population its control surface states.
 *
 * The predicate is the composed one the state already carries, so the figure the box states in its
 * footer is arrived at exactly as the figure the rail's chip states — the same predicate over the
 * same rows, rather than two counts that can drift.
 */
export const pageCount = (surface: PageSurface, state: PageState): number =>
  // A tab's own record is erased off the state a surface above it holds, and `Predicate<never>` is
  // what every domain's predicate becomes under that erasure.
  surface.data.filter(state.filter as (item: unknown) => boolean).length;

export const pageOf = (tabId: string, library: PageRows): PageSurface | undefined => {
  const page = PAGE_MODULES[tabId];
  const data = page?.rows(library);
  if (!page || !data) return undefined;

  return {
    schema: page.filters,
    store: page.pageState,
    measures: page.measures,
    noun: page.noun,
    data,
    earliestYear: page.earliestYear(data),
  };
};
