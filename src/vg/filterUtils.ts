import { Dispatch, useReducer } from "react";
import { Predicate } from "../utils/types";
import { Measure, VideoGame } from "./types";
import { CURRENT_YEAR } from "../utils/dateUtils";

export interface FilterState {
  endless: boolean;
  pokemon: boolean;
  unconfirmed: boolean;
  franchise: string[];
  platform: string[];
  genre: string[];
  measure: Measure;
  yearType: YearType;
  yearTo: number;
  filter: Predicate<VideoGame>;
}

export type FilterDispatch = Dispatch<Action<keyof FilterState>>;

export type Action<K extends keyof FilterState> =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: K; value: FilterState[K] }
  | { type: "toggleMeasure" }
  | { type: "toggleYearType" };


export const useFilterReducer = () => useReducer(reducer, initialState);

export type YearType = "date" | "exact"

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
        yearType: state.yearType == "date" ? "exact" : "date",
      };
      newState.filter = filters(newState);
      return newState;
    }
  }
};

const filters = (state: Omit<FilterState, "filter">) => (vg: VideoGame) =>
  [
    state.endless && (({ status }: VideoGame) => status !== "Endless"),
    state.pokemon && (({ franchise }: VideoGame) => franchise !== "Pokémon"),
    state.unconfirmed &&
      (({ platform, startDate }: VideoGame) => {
        if (platform === "PC") {
          if (!startDate?.getFullYear() || startDate.getFullYear() < 2015) return false;
        } else if (!["Nintendo Switch", "Nintendo 3DS", "PlayStation 4", "PlayStation 5"].includes(platform)) {
          return false;
        }

        return true;
      }),
    state.franchise.length > 0 && (({ franchise }: VideoGame) => state.franchise.includes(franchise)),
    state.platform.length > 0 && (({ platform }: VideoGame) => state.platform.includes(platform)),
    state.genre.length > 0 && (({ genre }: VideoGame) => state.genre.includes(genre)),
    state.yearTo !== CURRENT_YEAR && state.yearType === "date" && (({ startDate }: VideoGame) => startDate.getFullYear() <= state.yearTo),
    state.yearType === "exact" && (({ startDate }: VideoGame) => startDate.getFullYear() === state.yearTo),
  ]
    .filter((f): f is Exclude<typeof f, false> => Boolean(f))
    .reduce((p, c) => p && c(vg), true);

const initialState: FilterState = (() => {
  const state: FilterState = {
    endless: false,
    pokemon: false,
    unconfirmed: false,
    franchise: [],
    platform: [],
    genre: [],
    measure: "Games",
    yearType: "date",
    yearTo: CURRENT_YEAR,
    filter: (vg: VideoGame) => Boolean(vg),
  };

  state.filter = filters(state);

  return state;
})();
