import { useEffect, useReducer, type Dispatch } from "react";
import { useOutletContext } from "react-router-dom";
import { CURRENT_YEAR, type YearNumber } from "./date";
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
  guestMode: boolean;
  filter: Predicate<T>;
}

export type FilterAction<S, K extends keyof S = keyof S> =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: K; value: S[K] }
  | { type: "toggleMeasure" }
  | { type: "toggleYearType" };

export type FilterDispatchFor<S> = Dispatch<FilterAction<S, keyof S>>;

/**
 * The year cutoff, shared because every domain models it the same way: "up to" a year is a
 * ceiling that disappears once it reaches the current year, and "matching" is an exact year.
 */
export const yearPredicates = <T extends { startDate: { year: YearNumber } }>(state: {
  yearTo: YearNumber;
  yearType: YearType;
}): Predicate<T>[] => {
  if (state.yearType === "matching") return [(item) => item.startDate.year === state.yearTo];
  if (state.yearTo !== CURRENT_YEAR) return [(item) => item.startDate.year <= state.yearTo];
  return [];
};

/**
 * A multi-select's predicate, or none where nothing is selected.
 *
 * Every category control in every domain means the same thing — an empty selection is no
 * constraint rather than a constraint nothing satisfies — and each was stating that again beside
 * its own field. Written once, a change to what matching means is one edit rather than fifteen.
 *
 * Returns a list so a caller spreads it, which is what lets an inactive control contribute
 * nothing at all instead of a predicate that is always true.
 */
export const selectedPredicates = <T>(selected: readonly string[], valueOf: (item: T) => string): Predicate<T>[] =>
  selected.length > 0 ? [(item) => selected.includes(valueOf(item))] : [];

/**
 * Builds a domain's filter reducer. Each domain supplies only what is actually its own:
 * the initial values of its own fields, how to turn that state into a predicate, and how its
 * measure toggles. Everything else — the action shape, the guest-mode wiring, and rebuilding
 * `filter` after each change — is the same everywhere and lives here.
 */
export const createFilterReducer = <T, M extends string, S extends BaseFilterState<T, M>>(
  initialValues: Omit<S, "filter">,
  filters: (state: Omit<S, "filter">) => Predicate<T>,
  nextMeasure: (measure: M) => M,
) => {
  const withFilter = (state: Omit<S, "filter">): S => ({ ...state, filter: filters(state) }) as S;

  const initialState = withFilter(initialValues);

  const reducer = <K extends keyof S>(state: S, action: FilterAction<S, K>): S => {
    switch (action.type) {
      case "resetFilters":
        // Guest mode is set by the app, not the filter panel, so Clear must not unhide content.
        return withFilter({ ...initialValues, guestMode: state.guestMode });
      case "updateFilter":
        // Rebuilding `filter` hands every consumer a new predicate identity and so a fresh pass
        // over the whole dataset. A multi-select builds a new array on every real change, so an
        // identity match here only ever means nothing moved.
        if (state[action.filter] === action.value) return state;
        return withFilter({ ...state, [action.filter]: action.value });
      case "toggleMeasure":
        return { ...state, measure: nextMeasure(state.measure) };
      case "toggleYearType":
        return withFilter({ ...state, yearType: state.yearType === "upto" ? "matching" : "upto" });
    }
  };

  const useFilterReducer = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { guestMode } = useOutletContext<{ guestMode?: boolean }>();

    useEffect(() => {
      dispatch({ type: "updateFilter", filter: "guestMode" as keyof S, value: (guestMode || false) as S[keyof S] });
    }, [guestMode]);

    return [state, dispatch] as const;
  };

  // `reducer` and `initialState` come back out alongside the hook so the transitions can be
  // exercised as plain values. Nothing in the app reads them.
  return { useFilterReducer, reducer, initialState };
};
