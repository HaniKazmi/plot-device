import { type Dispatch } from "react";
import { CURRENT_YEAR, type YearNumber } from "./date";
import { fieldsOf, schemaPredicates, type CategoryKey, type FilterSchema, type ToggleKey } from "./filterSchema";
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
  /**
   * The same filters with the scope read as a ceiling whatever its reading: everything up to
   * `yearTo`, or the whole library once that year is the current one. The vitals band's first card
   * is titled "All time" or "Up to 2019" under either reading, and a card so titled fed the rows
   * "In 2026" left restates the in-year figures under the wrong words; this is the slice that card
   * and the yearly average beside it count. Under the "upto" reading it *is* `filter`, by identity,
   * so a consumer keyed on either predicate re-filters once per change and not twice.
   */
  filterUpTo: Predicate<T>;
}

type FilterAction<S, K extends keyof S = keyof S> =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: K; value: S[K] }
  // Holds a multi-select's selection to the values still on offer. The option list a select draws
  // is computed over the *visible* library, so a value the library stops offering — guest mode
  // switched on under a chosen franchise — would otherwise stay in the state with no control left
  // to show or clear it, narrowing every chart on the page to nothing for no visible reason.
  | { type: "retain"; category: CategoryKey<S>; values: readonly string[] }
  // Read off the state's own field rather than carried as a second parameter on the action union:
  // `S` already names the measure it holds, and a domain's dispatch is typed from `S` alone.
  | { type: "measure"; measure: S extends { measure: infer M } ? M : never }
  // The whole scope, both halves at once: a reading and the year it is read against are one choice
  // and neither is an answer without the other. Sent as two actions, moving from "Up to 2019" to
  // "In 2026" passes through "In 2019" — a scope nobody asked for, which every consumer on the
  // page re-filters its library against before the second action lands.
  | { type: "scope"; yearTo: YearNumber; yearType: YearType };

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
  | { type: "retain"; category: string; values: readonly string[] }
  | { type: "measure"; measure: string }
  | { type: "scope"; yearTo: YearNumber; yearType: YearType };

export type PageDispatch = Dispatch<PageAction>;

/**
 * The rows the vitals band's first card counts, beside the filtered ones an entry already holds:
 * the same array where the two predicates are one, which they are under the "upto" reading, and a
 * second pass otherwise.
 */
export const upToSlice = <T>(
  data: T[],
  filtered: T[],
  state: Pick<BaseFilterState<T, string>, "filter" | "filterUpTo">,
): T[] => (state.filterUpTo === state.filter ? filtered : data.filter(state.filterUpTo));

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
  /**
   * How many of the reader's own choices a state holds, bound to the initial values this store's
   * own reducer knows — a surface above the tabs holds five stores and no baseline to count
   * against.
   *
   * The state is the caller's rather than read out of the store here, so the figure is a function
   * of what the component already subscribed to: read off `get()` inside a render, it is a value
   * the React Compiler sees no dependency for, and a badge memoised at the count the page was
   * first drawn with never moves again.
   */
  activeCountOf(state: PageState): number;
}

/** What a domain's own store is, before the erasure a lookup across the five needs. */
type PageStoreFor<S> = Store<S> & { dispatch: FilterDispatchFor<S>; activeCountOf(state: S): number };

interface YearState {
  yearTo: YearNumber;
  yearType: YearType;
}

/**
 * The year cutoff, shared because every domain means the same thing by it: "up to" a year is a
 * ceiling that disappears once it reaches the current year, and "matching" is an exact year.
 *
 * Which year an item answers with is the one part that varies, so it arrives as an accessor rather
 * than as a second copy of the two rules. An `OmniItem` counts towards the year it closed and holds
 * no start date to read at all, and a copy written over that field is two statements of one
 * semantic that nothing keeps in step.
 *
 * The accessor is a parameter and never a default, because a default has to be written over a
 * generic record: `(item as { startDate: … }).startDate.year` type-checks against every model
 * there is, so a domain whose record has no start date would compile and answer `undefined` for
 * every row — a year scope that silently keeps nothing.
 */
export const yearPredicates = <T>(state: YearState, yearOf: (item: T) => YearNumber): Predicate<T>[] => {
  if (state.yearType === "matching") return [(item) => yearOf(item) === state.yearTo];
  if (state.yearTo !== CURRENT_YEAR) return [(item) => yearOf(item) <= state.yearTo];
  return [];
};

/**
 * How a tab reads the year scope, where that is not the shared rule over a record's start date: a
 * model whose year is an attribution rather than a date, or one whose page asks the scope of
 * something nested — a show's seasons rather than the show.
 */
export type YearRule<T> = (state: YearState) => Predicate<T>[];

/**
 * What the state holds that is not a filter: the unit its figures are counted in, the composed
 * predicate itself, and the year scope.
 *
 * The scope is a control of its own, lit where it is not "all time", so counting it would put a
 * badge on the filter surface for a choice made outside it — and offer Clear as a second way to
 * undo something that already says on its own face that it is on.
 */
const UNCOUNTED_FIELDS = new Set(["measure", "filter", "filterUpTo", "yearTo", "yearType"]);

/** Element-wise, because a multi-select builds a new array for every change including a clear. */
const sameValue = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((item, index) => item === b[index]) : a === b;

/**
 * How many of the reader's own choices are in play, for the badge on the rail's own handle.
 *
 * A control surface that is closed says nothing about what it is holding, and every chart on the
 * page is drawn through it — so a page filtered down to one franchise looks exactly like one that
 * is not.
 * The count is of fields rather than of predicates: a reader picking three genres in one select
 * made one choice and can undo it in one place, which is what a badge of 1 says and a badge of 3
 * does not.
 */
export const countActiveFilters = (state: object, initialValues: object): number =>
  Object.entries(initialValues).filter(([field, initial]) => {
    if (UNCOUNTED_FIELDS.has(field)) return false;
    const value = fieldsOf(state)[field];
    // A composed predicate under any other name is still not something the reader set.
    if (typeof value === "function" || typeof initial === "function") return false;
    return !sameValue(value, initial);
  }).length;

/**
 * Builds a domain's filter reducer and the store its state lives in, from the schema that already
 * says what the tab can be narrowed by. Each domain supplies only what its schema cannot: the unit
 * its figures are counted in, where its year scope starts, which year its own records answer with,
 * and — where that scope asks something else of the model — the whole rule. Everything else, the
 * action shape, rebuilding `filter` after each change and counting what the reader has changed, is
 * the same everywhere and lives here.
 *
 * The unfiltered state is the schema's own: a toggle starts on, since `hides` applies while one is
 * off, and a category starts empty, an empty selection being no constraint. Derived rather than
 * restated per domain, so a filter added to a schema cannot arrive without a starting value — a
 * toggle left out would start `undefined`, which reads as off and hides rows on first paint. What
 * the schema does not seed is what `initial` is typed as, so neither half can be left unstated.
 *
 * The state is held in a store rather than in a `useReducer` because the surfaces that read it are
 * not all inside the tab: the rail and the search box stand beside the tab's charts rather than
 * within them, and a tab's state can be set before that tab is ever mounted. Their nearest common
 * ancestor is the shell, so a value lifted there would re-render every chart in the app on a
 * change one of them made. It also means a store per domain at module scope, which is what
 * `createStore` is written to allow: it reads no browser global while it loads.
 */
export const createFilterReducer = <T, M extends string, S extends BaseFilterState<T, M>>({
  schema,
  initial,
  yearOf,
  yearRule,
}: {
  schema: FilterSchema<T, S>;
  /**
   * Every field of the state the schema does not seed, which is the page's own settings: the
   * measure it counts in and the scope it opens at.
   *
   * Stated as what is left rather than as those three by name, so a field added to a domain's
   * state that no toggle and no category covers has to be given a starting value here or it fails
   * to compile — where a fixed shape would let it start `undefined` and be read as a filter that
   * hides everything on first paint.
   */
  initial: Omit<S, "filter" | "filterUpTo" | ToggleKey<S> | CategoryKey<S>>;
  /**
   * The year an item counts towards, which is the one part of the shared cutoff that varies by
   * model — a start date on three of the four sheets, an attribution on the union.
   */
  yearOf: (item: T) => YearNumber;
  /** A whole rule in place of that reading, where a tab's scope asks something else of its model. */
  yearRule?: YearRule<T>;
}) => {
  type Values = Omit<S, "filter" | "filterUpTo">;

  const scope: YearRule<T> = yearRule ?? ((state) => yearPredicates(state, yearOf));

  const initialValues = {
    ...Object.fromEntries(schema.toggles.map((toggle) => [toggle.key, true])),
    ...Object.fromEntries(schema.categories.map((category) => [category.key, []])),
    ...initial,
    // Keys and their fields are checked against each other where the schema is written; built back
    // into a state object they are strings again, which is a lookup TypeScript cannot reduce, so
    // the merge of the two halves is asserted rather than derived.
  } as Values;

  /**
   * The tab's predicate: every per-field rule the schema states, and then the year scope, which
   * belongs to no field and is a reading of the whole page rather than a narrowing of it.
   */
  const compose =
    (predicates: Predicate<T>[]): Predicate<T> =>
    (item: T) =>
      predicates.every((predicate) => predicate(item));

  const filters = (state: Values): Predicate<T> =>
    // `S` extends the base state, so the scope's two fields are on it; `Omit` over a generic is a
    // lookup TypeScript defers, so it cannot see that here.
    compose([...schemaPredicates(schema, state), ...scope(state as unknown as YearState)]);

  const withFilter = (state: Values): S => {
    // The schema's predicates read no year field, so they are built once and the two readings of
    // the scope are composed over them.
    const fields = schemaPredicates(schema, state);
    const year = state as unknown as YearState;
    const filter = compose([...fields, ...scope(year)]);
    const filterUpTo =
      year.yearType === "upto" ? filter : compose([...fields, ...scope({ ...year, yearType: "upto" })]);
    return { ...state, filter, filterUpTo } as S;
  };

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
      case "retain": {
        // The same state object where nothing is dropped, which is every call but the few that
        // follow a change of what the library shows: the store notifies on identity, so the sweep
        // that runs whenever a library lands costs no render.
        const held = fieldsOf(state)[action.category] as readonly string[];
        const kept = held.filter((value) => action.values.includes(value));
        if (kept.length === held.length) return state;
        return withFilter({ ...state, [action.category]: kept });
      }
      case "measure":
        // `filter` is carried through unrebuilt: no domain's filters() reads the measure, and
        // consumers re-filter the whole dataset on that predicate's identity. The identity
        // short-circuit is `updateFilter`'s, for the same reason — pressing the lit segment
        // costs no render.
        if (state.measure === action.measure) return state;
        return { ...state, measure: action.measure as M };
      case "scope":
        // The action names the scope rather than flipping a reading, as the measure does: a
        // control with a state per reading has to answer the same object when the reader picks
        // the one already held, or every press costs a render and a re-filter of the page.
        if (state.yearTo === action.yearTo && state.yearType === action.yearType) return state;
        return withFilter({ ...state, yearTo: action.yearTo, yearType: action.yearType });
    }
  };

  const { get, set, subscribe, useValue } = createStore(initialState);

  const dispatch: FilterDispatchFor<S> = (action) => set(reducer(get(), action));

  const store: PageStoreFor<S> = {
    get,
    set,
    subscribe,
    useValue,
    dispatch,
    activeCountOf: (state) => activeCount(state),
  };

  /**
   * The tab's own view of that store, for the pages that read their state from inside the tab.
   * The same store either way, so a chart and the rail above it cannot hold two versions of one
   * choice, and the dispatch is one module-scope function rather than a fresh identity per render.
   */
  const useFilterReducer = () => [useValue(), dispatch] as const;

  /**
   * The badge's figure, bound to the initial values this reducer already holds rather than asked
   * of each surface drawing the filters — a call site naming its own baseline is one that can name
   * the wrong one.
   */
  const activeCount = (state: S) => countActiveFilters(state, initialValues);

  // `filters`, `reducer` and `initialState` come back out alongside the store so the composed
  // predicate and the transitions can be exercised as plain values. Nothing in the app reads them.
  return { store, useFilterReducer, filters, reducer, initialState, activeCount };
};
