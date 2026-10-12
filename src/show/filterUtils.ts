import { CURRENT_YEAR, type YearNumber } from "../common/date";
import type { Certificate, Predicate } from "../utils/types";
import type { Measure, Season, Show } from "./types";
import {
  createFilterReducer,
  type BaseFilterState,
  type FilterDispatchFor,
  type YearType,
} from "../common/filterReducer";
import { showFilters } from "./filters";

export interface FilterState extends BaseFilterState<Show, Measure> {
  /** Whether Abandoned shows count — the pile that drags every average when it is in the picture. */
  abandoned: boolean;
  /** Which styles the page holds, empty being all three. */
  style: string[];
  genre: string[];
  network: string[];
  franchise: string[];
  certificate: Certificate[];
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
  const inScope = seasonInScope(state);
  return inScope ? [(show) => show.s.some(inScope)] : [];
};

/**
 * Whether a season started inside the year scope, or `undefined` where the scope holds everything.
 * The one rule both the show filter and a per-season surface read, so a wall of seasons scoped to
 * a year holds the seasons the vitals card beside it counts.
 */
export const seasonInScope = (state: { yearTo: YearNumber; yearType: YearType }): Predicate<Season> | undefined => {
  if (state.yearType === "matching") return (season) => season.startDate.year === state.yearTo;
  if (state.yearTo !== CURRENT_YEAR) return (season) => season.startDate.year <= state.yearTo;
  return undefined;
};

export const {
  store: pageState,
  useFilterReducer,
  filters,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<Show, Measure, FilterState>({
  schema: showFilters,
  initial: { measure: "Episodes", yearType: "upto", yearTo: CURRENT_YEAR },
  // A show's own start is its first season's, which is the year the rest of the app attributes it
  // to; the scope alone reads the seasons instead, for the reason above, so it states a whole rule.
  yearOf: (show) => show.startDate.year,
  yearRule: showYearPredicates,
});
