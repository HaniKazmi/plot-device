import { CURRENT_YEAR, type YearNumber } from "../common/date";
import type { Predicate } from "../utils/types";
import type { Measure, Show, Type } from "./types";
import {
  createFilterReducer,
  type BaseFilterState,
  type FilterDispatchFor,
  type YearType,
} from "../common/filterReducer";
import { schemaPredicates } from "../common/filterSchema";
import { showFilters } from "./filters";

export interface FilterState extends BaseFilterState<Show, Measure> {
  /** Whether Abandoned shows count — the pile that drags every average when it is in the picture. */
  abandoned: boolean;
  /** Whether anime counts — the single largest sub-population, as Pokémon is on the games tab. */
  anime: boolean;
  genre: string[];
  network: string[];
  franchise: string[];
  type: Type[];
}

export type FilterDispatch = FilterDispatchFor<FilterState>;

/**
 * The year cutoff, season-aware rather than the shared `yearPredicates`. The shared predicate
 * reads `startDate.year`, which for a show is its *first* season — so "in 2024" would keep only
 * shows that began that year, while the vitals card beside the control counts seasons started in
 * it. Asking "does the show have a season started in (or by) the year" keeps the filter and the
 * figures answering the same question.
 */
const showYearPredicates = (state: { yearTo: YearNumber; yearType: YearType }): Predicate<Show>[] => {
  if (state.yearType === "matching") return [(show) => show.s.some((season) => season.startDate.year === state.yearTo)];
  if (state.yearTo !== CURRENT_YEAR) return [(show) => show.s.some((season) => season.startDate.year <= state.yearTo)];
  return [];
};

/**
 * The tab's predicate: every per-field rule the schema states, and then the year scope, which
 * belongs to no field and is a reading of the whole page rather than a narrowing of it.
 */
export const filters = (state: Omit<FilterState, "filter">): Predicate<Show> => {
  const predicates: Predicate<Show>[] = [...schemaPredicates(showFilters, state), ...showYearPredicates(state)];

  return (show: Show) => predicates.every((p) => p(show));
};

export const {
  store: pageState,
  useFilterReducer,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<Show, Measure, FilterState>(
  {
    abandoned: true,
    anime: true,
    genre: [],
    network: [],
    franchise: [],
    type: [],
    measure: "Episodes",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
  },
  filters,
);
