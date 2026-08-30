import { CURRENT_YEAR } from "../common/date";
import type { Predicate } from "../utils/types";
import type { Measure, Show } from "./types";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
} from "../common/filterReducer";

// The year cutoff has no UI on this tab yet — the reducer supports it so a year filter can be
// added the way Games has one, without reworking the state.
export type FilterState = BaseFilterState<Show, Measure>;

export type FilterDispatch = FilterDispatchFor<FilterState>;

export const filters = (state: Omit<FilterState, "filter">): Predicate<Show> => {
  const predicates: Predicate<Show>[] = [...yearPredicates<Show>(state)];

  if (state.guestMode) {
    predicates.push((show) => show.type !== "anime");
  }

  return (show: Show) => predicates.every((p) => p(show));
};

export const { useFilterReducer, reducer, initialState } = createFilterReducer<Show, Measure, FilterState>(
  {
    measure: "Episodes",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
    guestMode: false,
  },
  filters,
  (measure) => (measure === "Episodes" ? "Hours" : "Episodes"),
);
