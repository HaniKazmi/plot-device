import { useSyncExternalStore } from "react";
import type { PageDispatch, PageState, PageStore } from "../common/filterReducer";
import { categoryValues, type PageSchema } from "../common/filterSchema";
import type { OmniItem } from "../common/medium";
import { omniFilters } from "../omnibus/filters";
import { pageState as omnibusPageState } from "../omnibus/filterUtils";
import type { Library } from "./library";
import { eachMedium, mediaModules } from "./media";

/**
 * The composing tab's own id, as a string rather than read off its `Tab`: `tabs.ts` imports the
 * five entry components eagerly and an entry component reaches this folder, so an import back
 * would evaluate this module while `tabs.ts` was still in its own temporal dead zone.
 */
const OMNIBUS_TAB = "omnibus";

/**
 * Every tab's page state, by tab id.
 *
 * Keyed by tab and not by medium, because the composing tab is a page with filters, a measure and
 * a scope like any other and is no medium at all. Each store is created beside the reducer that
 * owns its initial state, in that tab's own `filterUtils.ts`, so this is a lookup and never a
 * second declaration of what a tab's state holds.
 *
 * Every tab has an entry, which is what lets `usePageState` read one unconditionally — a hook
 * cannot be skipped for a tab that has none, and `tests/app/pageState.test.ts` pins the map
 * against the tabs themselves.
 */
export const PAGE_STORES: Record<string, PageStore> = {
  ...Object.fromEntries(mediaModules.map((module) => [module.tabId, module.pageState])),
  [OMNIBUS_TAB]: omnibusPageState,
};

/** One page's selections held to the vocabulary its own controls are drawing. */
const retainSelections = (store: PageStore, schema: PageSchema, data: readonly unknown[]) => {
  for (const category of schema.categories)
    store.dispatch({ type: "retain", category: category.key, values: categoryValues(category, data) });
};

/**
 * Every tab's multi-selects held to the values its own library still offers.
 *
 * A category's options are computed over the visible library, so guest mode switched on under a
 * chosen franchise leaves that franchise selected in the store while the select no longer lists it:
 * the page narrows to nothing and there is no chip anywhere to take the choice back. Swept per tab
 * against exactly the rows that tab's own drawer draws its lists from — each medium's visible
 * slice, and the union for the composing tab.
 *
 * A slice still in flight is skipped rather than swept against nothing: on a cold cache a library
 * is absent until its sheet lands, and an empty list would clear every selection the reader made.
 *
 * Here rather than beside the library because this is the one file in `app/` that names the
 * composing tab, whose store is registered by name until it has a module of its own.
 */
export const retainPageSelections = (library: Partial<Library>, items: OmniItem[] | undefined) => {
  eachMedium((medium, module) => {
    const slice = library[medium];
    if (slice) retainSelections(module.pageState, module.filters, slice);
  });

  if (items) retainSelections(omnibusPageState, omniFilters, items);
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
