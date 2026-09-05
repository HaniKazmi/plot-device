import { type Dispatch } from "react";
import { CURRENT_YEAR, type YearNumber } from "./date";
import { createStore, type Store } from "./store";
import type { Predicate } from "../utils/types";

export type YearType = "upto" | "matching";

/**
 * The filter state every domain carries, whatever else it adds on top.
 *
 * `filter` is a composed predicate held *in* the state rather than derived at the call site:
 * the reducer rebuilds it on every change, so components can call `data.filter(state.filter)`
 * without knowing which criteria are active.
 */
export interface BaseFilterState<T, M extends string> {
  measure: M;
  yearType: YearType;
  yearTo: YearNumber;
  filter: Predicate<T>;
}

type FilterAction<S, K extends keyof S = keyof S> =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: K; value: S[K] }
  // Read off the state's own field rather than carried as a second parameter on the action union:
  // `S` already names the measure it holds, and a domain's dispatch is typed from `S` alone.
  | { type: "measure"; measure: S extends { measure: infer M } ? M : never }
  | { type: "yearType"; yearType: YearType };

export type FilterDispatchFor<S> = Dispatch<FilterAction<S, keyof S>>;

/**
 * A tab's state as a surface above that tab reads it, with the domain's own fields erased.
 *
 * `never` and `string` are what make all five concrete states assignable here: a measure is a
 * union of that tab's own words, which is a `string`, and a `Predicate<VideoGame>` is a
 * `Predicate<never>` because every parameter type accepts `never`. Reading a field one tab adds
 * to the base means knowing which tab it is, which is exactly what a surface standing above them
 * does not.
 */
export type PageState = BaseFilterState<never, string>;

/**
 * The same erasure for what such a surface sends. A field is named rather than typed, because the
 * surface that sets a filter on a tab it is not standing inside knows the field by its name alone.
 */
export type PageAction =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: string; value: unknown }
  | { type: "measure"; measure: string }
  | { type: "yearType"; yearType: YearType };

export type PageDispatch = Dispatch<PageAction>;

/**
 * A tab's page state, held outside React so that a surface above the tab can read and set it.
 *
 * Every member is a method rather than a property: `set` and `dispatch` take the state and the
 * actions of one particular tab, and a property-typed parameter is contravariant, so a record
 * holding five stores over five different states would reject all five. TypeScript checks a
 * method's parameters bivariantly, which is what lets the erased shape hold them.
 */
export interface PageStore {
  get(): PageState;
  set(next: PageState): void;
  subscribe(onChange: () => void): () => void;
  useValue(): PageState;
  dispatch(action: PageAction): void;
}

/** What a domain's own store is, before the erasure a lookup across the five needs. */
type PageStoreFor<S> = Store<S> & { dispatch: FilterDispatchFor<S> };

interface YearState {
  yearTo: YearNumber;
  yearType: YearType;
}

/**
 * Two ways to ask, so a caller only supplies the accessor when its model needs one: a domain whose
 * record carries the date the year comes from names no second argument, and one that attributes an
 * item to some other year has to.
 */
interface YearPredicates {
  <T extends { startDate: { year: YearNumber } }>(state: YearState): Predicate<T>[];
  <T>(state: YearState, yearOf: (item: T) => YearNumber): Predicate<T>[];
}

/**
 * The year cutoff, shared because every domain means the same thing by it: "up to" a year is a
 * ceiling that disappears once it reaches the current year, and "matching" is an exact year.
 *
 * Which year an item answers with is the one part that varies, so it arrives as an accessor rather
 * than as a second copy of the two rules. An `OmniItem` counts towards the year it closed and holds
 * no start date to read at all, and a copy written over that field is two statements of one
 * semantic that nothing keeps in step.
 */
export const yearPredicates: YearPredicates = <T>(
  state: YearState,
  yearOf: (item: T) => YearNumber = (item) => (item as { startDate: { year: YearNumber } }).startDate.year,
): Predicate<T>[] => {
  if (state.yearType === "matching") return [(item) => yearOf(item) === state.yearTo];
  if (state.yearTo !== CURRENT_YEAR) return [(item) => yearOf(item) <= state.yearTo];
  return [];
};

/**
 * A multi-select's predicate, or none where nothing is selected.
 *
 * Every category control in every domain means the same thing — an empty selection is no
 * constraint rather than a constraint nothing satisfies. Stated once, a change to what matching
 * means is one edit; stated per category per domain, it is fifteen, and fifteen chances to differ.
 *
 * Returns a list so a caller spreads it, which is what lets an inactive control contribute
 * nothing at all instead of a predicate that is always true.
 */
export const selectedPredicates = <T>(selected: readonly string[], valueOf: (item: T) => string): Predicate<T>[] =>
  selected.length > 0 ? [(item) => selected.includes(valueOf(item))] : [];

/**
 * What the state holds that is not a filter: the unit its figures are counted in, the composed
 * predicate itself, and the year scope.
 *
 * The scope is a control of its own, lit where it is not "all time", so counting it would put a
 * badge on the filter surface for a choice made outside it — and offer Clear as a second way to
 * undo something that already says on its own face that it is on.
 */
const UNCOUNTED_FIELDS = new Set(["measure", "filter", "yearTo", "yearType"]);

/** Element-wise, because a multi-select builds a new array for every change including a clear. */
const sameValue = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((item, index) => item === b[index]) : a === b;

/**
 * How many of the reader's own choices are in play, for the badge on the filter button.
 *
 * A closed drawer says nothing about what it is hiding, and every chart on the page is drawn
 * through it — so a page filtered down to one franchise looks exactly like a page that is not.
 * The count is of fields rather than of predicates: a reader picking three genres in one select
 * made one choice and can undo it in one place, which is what a badge of 1 says and a badge of 3
 * does not.
 */
export const countActiveFilters = (state: object, initialValues: object): number =>
  Object.entries(initialValues).filter(([field, initial]) => {
    if (UNCOUNTED_FIELDS.has(field)) return false;
    const value = (state as Record<string, unknown>)[field];
    // A composed predicate under any other name is still not something the reader set.
    if (typeof value === "function" || typeof initial === "function") return false;
    return !sameValue(value, initial);
  }).length;

/**
 * Builds a domain's filter reducer and the store its state lives in. Each domain supplies only
 * what is actually its own: the initial values of its own fields and how to turn that state into a
 * predicate. Everything else — the action shape, rebuilding `filter` after each change, and
 * counting what the reader has changed — is the same everywhere and lives here.
 *
 * The state is held in a store rather than in a `useReducer` because the surfaces that read it are
 * not all inside the tab: the rail and the search box stand beside the tab's charts rather than
 * within them, and a tab's state can be set before that tab is ever mounted. Their nearest common
 * ancestor is the shell, so a value lifted there would re-render every chart in the app on a
 * change one of them made. It also means a store per domain at module scope, which is what
 * `createStore` is written to allow: it reads no browser global while it loads.
 */
export const createFilterReducer = <T, M extends string, S extends BaseFilterState<T, M>>(
  initialValues: Omit<S, "filter">,
  filters: (state: Omit<S, "filter">) => Predicate<T>,
) => {
  const withFilter = (state: Omit<S, "filter">): S => ({ ...state, filter: filters(state) }) as S;

  const initialState = withFilter(initialValues);

  const reducer = <K extends keyof S>(state: S, action: FilterAction<S, K>): S => {
    switch (action.type) {
      case "resetFilters":
        // The filter surface's own fields and no others. The measure is the unit the whole tab
        // counts in and the scope is a control beside it, both stated where the reader set them,
        // so clearing filters leaves someone reading hours up to 2019 exactly where they were.
        return withFilter({
          ...initialValues,
          measure: state.measure,
          yearTo: state.yearTo,
          yearType: state.yearType,
        });
      case "updateFilter":
        // Rebuilding `filter` hands every consumer a new predicate identity and so a fresh pass
        // over the whole dataset. A multi-select builds a new array on every real change, so an
        // identity match here only ever means nothing moved.
        if (state[action.filter] === action.value) return state;
        return withFilter({ ...state, [action.filter]: action.value });
      case "measure":
        // `filter` is carried through unrebuilt: no domain's filters() reads the measure, and
        // consumers re-filter the whole dataset on that predicate's identity. The identity
        // short-circuit is `updateFilter`'s, for the same reason — pressing the lit segment
        // costs no render.
        if (state.measure === action.measure) return state;
        return { ...state, measure: action.measure as M };
      case "yearType":
        // The action names the reading rather than flipping to the other one, as the measure
        // does: a control with a state per reading has to answer the same object when the reader
        // presses the one already held, or every press costs a render and a re-filter.
        if (state.yearType === action.yearType) return state;
        return withFilter({ ...state, yearType: action.yearType });
    }
  };

  const { get, set, subscribe, useValue } = createStore(initialState);

  const dispatch: FilterDispatchFor<S> = (action) => set(reducer(get(), action));

  const store: PageStoreFor<S> = { get, set, subscribe, useValue, dispatch };

  /**
   * The tab's own view of that store, for the pages that read their state from inside the tab.
   * The same store either way, so a chart and the rail above it cannot hold two versions of one
   * choice, and the dispatch is one module-scope function rather than a fresh identity per render.
   */
  const useFilterReducer = () => [useValue(), dispatch] as const;

  /**
   * The badge's figure, bound to the initial values this reducer already holds rather than asked
   * of each domain's own `Filter.tsx` — five call sites naming their own baseline are five that
   * can name the wrong one.
   */
  const activeCount = (state: S) => countActiveFilters(state, initialValues);

  // `reducer` and `initialState` come back out alongside the store so the transitions can be
  // exercised as plain values. Nothing in the app reads those two.
  return { store, useFilterReducer, reducer, initialState, activeCount };
};
