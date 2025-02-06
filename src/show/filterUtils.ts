import { useEffect, useReducer, type Dispatch } from "react";
import { CURRENT_YEAR, type YearNumber } from "../common/date";
import type { Predicate } from "../utils/types";
import type { Measure, Show } from "./types";
import { useSetGuestModeSetter } from "../utils/googleUtils";

export interface FilterState {
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  guestMode: boolean;
  filter: Predicate<Show>;
}

export type FilterDispatch = Dispatch<Action<keyof FilterState>>;

type Action<K extends keyof FilterState> =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: K; value: FilterState[K] }
  | { type: "toggleMeasure" }
  | { type: "toggleYearType" };

export const useFilterReducer = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { setGuestModeSetter } = useSetGuestModeSetter();

  useEffect(() => {
    setGuestModeSetter((guestMode: boolean) => dispatch({ type: "updateFilter", filter: "guestMode", value: guestMode }))
  }, [setGuestModeSetter])
  
  return [state, dispatch] as const;
};

const reducer = <K extends keyof FilterState>(state: FilterState, action: Action<K>): FilterState => {
  switch (action.type) {
    case "resetFilters":
      return initialState;
    case "updateFilter": {
      const newState = {
        ...state,
      };
      newState[action.filter] = action.value;
      newState.filter = filters(newState);
      return newState;
    }
    case "toggleMeasure": {
      return {
        ...state,
        measure: state.measure == "Episodes" ? "Hours" : "Episodes",
      };
    }
    case "toggleYearType": {
      const newState: FilterState = {
        ...state,
        yearType: state.yearType == "upto" ? "matching" : "upto",
      };
      newState.filter = filters(newState);
      return newState;
    }
  }
};

export type YearType = "upto" | "matching";

const filters = (state: Omit<FilterState, "filter">) => (show: Show) =>
  [
    state.yearTo !== CURRENT_YEAR &&
      state.yearType === "upto" &&
      (({ startDate }: Show) => startDate.year <= state.yearTo),
    state.yearType === "matching" && (({ startDate }: Show) => startDate.year === state.yearTo),
    state.guestMode === true && (({ anime }: Show) => !anime),
  ]
    .filter((f): f is Exclude<typeof f, false> => Boolean(f))
    .reduce((p, c) => p && c(show), true);

const initialState: FilterState = (() => {
  const state: FilterState = {
    measure: "Episodes",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
    guestMode: false,
    filter: (show: Show) => Boolean(show),
  };

  state.filter = filters(state);

  return state;
})();
