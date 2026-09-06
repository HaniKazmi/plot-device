import { useSyncExternalStore } from "react";
import type { YearNumber } from "../common/date";
import type { PageDispatch, PageState, PageStore } from "../common/filterReducer";
import { categoryValues, fieldsOf, type PageSchema } from "../common/filterSchema";
import type { OmniItem } from "../common/medium";
import { omniFilters } from "../omnibus/filters";
import {
  earliestYear as omnibusEarliestYear,
  MEASURES as OMNIBUS_MEASURES,
  NOUN as OMNIBUS_NOUN,
  pageState as omnibusPageState,
} from "../omnibus/filterUtils";
import type { Library, LibraryValue } from "./library";
import { eachMedium, mediaModules, MEDIA } from "./media";
import { MEDIA as MEDIA_ORDER } from "../utils/types";

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

/**
 * One page's selections held to the vocabulary its own controls are drawing.
 *
 * A category holding nothing is skipped before its options are asked for: `categoryValues` is a
 * pass over the whole library per category, and this runs for all five tabs each time a sheet
 * lands, where the common case is a reader who has selected nothing anywhere. Nothing held is
 * nothing to drop, so the skip changes no answer.
 */
const retainSelections = (store: PageStore, schema: PageSchema, data: readonly unknown[]) => {
  const fields = fieldsOf(store.get());

  for (const category of schema.categories) {
    const held = fields[category.key] as readonly string[] | undefined;
    if (!held?.length) continue;
    store.dispatch({ type: "retain", category: category.key, values: categoryValues(category, data) });
  }
};

/**
 * Every tab's multi-selects held to the values its own library still offers.
 *
 * A category's options are computed over the visible library, so guest mode switched on under a
 * chosen franchise leaves that franchise selected in the store while the select no longer lists it:
 * the page narrows to nothing and there is no chip anywhere to take the choice back. Swept per tab
 * against exactly the rows that tab's own controls draw their lists from — each medium's visible
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

export const pageOf = (tabId: string, library: LibraryValue): PageSurface | undefined => {
  if (tabId === OMNIBUS_TAB) {
    const items = library.items;
    if (!items) return undefined;
    return {
      schema: omniFilters,
      store: omnibusPageState,
      measures: OMNIBUS_MEASURES,
      noun: OMNIBUS_NOUN,
      data: items,
      earliestYear: omnibusEarliestYear(items),
    };
  }

  const medium = MEDIA_ORDER.find((candidate) => MEDIA[candidate].tabId === tabId);
  if (!medium) return undefined;
  const module = MEDIA[medium];
  const data = library.visible[medium];
  if (!data) return undefined;

  return {
    schema: module.filters,
    store: module.pageState,
    measures: module.measures,
    noun: module.noun,
    data,
    // The pairing survives the lookup: `library.visible[medium]` and `MEDIA[medium]` are read off
    // one key, and the assertion is only that TypeScript cannot follow a `find` back to it.
    earliestYear: module.earliestYear(data as never),
  };
};
