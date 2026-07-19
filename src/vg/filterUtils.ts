import { useEffect, useReducer, type Dispatch } from "react";
import { useOutletContext } from "react-router-dom";
import { Predicate } from "../utils/types";
import { Measure, Platform, VideoGame } from "./types";
import { CURRENT_YEAR, Year, YearNumber } from "../common/date";

export interface FilterState {
  endless: boolean;
  pokemon: boolean;
  unconfirmed: boolean;
  franchise: string[];
  platform: Platform[];
  genre: string[];
  publisher: string[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  guestMode: boolean;
  filter: Predicate<VideoGame>;
}

export type FilterDispatch = Dispatch<Action<keyof FilterState>>;

type Action<K extends keyof FilterState> =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: K; value: FilterState[K] }
  | { type: "toggleMeasure" }
  | { type: "toggleYearType" };

export const useFilterReducer = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { guestMode } = useOutletContext<{ guestMode?: boolean }>();

  useEffect(() => {
    dispatch({ type: "updateFilter", filter: "guestMode", value: guestMode || false });
  }, [guestMode]);

  return [state, dispatch] as const;
};

export type YearType = "upto" | "matching";

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
        measure: state.measure == "Games" ? "Hours" : "Games",
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

const filters = (state: Omit<FilterState, "filter">) => {
  const predicates: Predicate<VideoGame>[] = [];

  if (!state.endless) predicates.push((vg) => vg.status !== "Endless");
  if (!state.pokemon) predicates.push((vg) => vg.franchise !== "Pokémon");
  if (!state.unconfirmed)
    predicates.push((vg) => {
      if (vg.platform === "PC") {
        if (vg.startDate instanceof Year || vg.startDate.year < 2015) return false;
      } else if (
        !["Nintendo Switch", "Nintendo Switch 2", "Nintendo 3DS", "PlayStation 4", "PlayStation 5"].includes(
          vg.platform,
        )
      ) {
        return false;
      }
      return true;
    });

  if (state.franchise.length > 0) predicates.push((vg) => state.franchise.includes(vg.franchise));
  if (state.platform.length > 0) predicates.push((vg) => state.platform.includes(vg.platform));
  if (state.genre.length > 0) predicates.push((vg) => state.genre.includes(vg.genre));
  if (state.publisher.length > 0) predicates.push((vg) => state.publisher.includes(vg.publisher));

  if (state.yearTo !== CURRENT_YEAR && state.yearType === "upto") {
    predicates.push((vg) => vg.startDate.year <= state.yearTo);
  }
  if (state.yearType === "matching") {
    predicates.push((vg) => vg.startDate.year === state.yearTo);
  }

  if (state.guestMode) {
    predicates.push((vg) => !vg.theme.includes("Adult"));
  }

  return (vg: VideoGame) => predicates.every((p) => p(vg));
};

const initialState: FilterState = (() => {
  const state: FilterState = {
    endless: true,
    pokemon: true,
    unconfirmed: true,
    franchise: [],
    platform: [],
    genre: [],
    publisher: [],
    measure: "Games",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
    guestMode: false,
    filter: (vg: VideoGame) => Boolean(vg),
  };

  state.filter = filters(state);

  return state;
})();
