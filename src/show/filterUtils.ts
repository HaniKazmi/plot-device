import { CURRENT_YEAR, type YearNumber } from "../common/date";
import type { Predicate } from "../utils/types";
import type { Measure, Show, Type } from "./types";
import {
  createFilterReducer,
  type BaseFilterState,
  type FilterDispatchFor,
  type YearType,
  selectedPredicates,
} from "../common/filterReducer";

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
 * What guest mode hides on this tab: anime, which is also what the anime toggle drops — one rule
 * for the two, so the mode and the toggle cannot hide by two different definitions.
 *
 * Exported because the mode is applied to the library itself, above every tab: narrowing this
 * page's charts alone would leave a hidden show on screen through the franchise index and the
 * union, which are built from the library.
 */
export const guestFilter: Predicate<Show> = (show) => show.type !== "anime";

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

export const filters = (state: Omit<FilterState, "filter">): Predicate<Show> => {
  const predicates: Predicate<Show>[] = [];

  if (!state.abandoned) predicates.push((show) => show.status !== "Abandoned");
  if (!state.anime) predicates.push(guestFilter);

  // Matches the primary genre only, not `genres`: the charts group on `genre`, and a filter that
  // also matched the secondary list would keep shows the Top Genre bar attributes elsewhere —
  // the two halves of the page would disagree about what "Drama" holds.
  predicates.push(
    ...selectedPredicates(state.genre, (show: Show) => show.genre),
    ...selectedPredicates(state.network, (show: Show) => show.network),
    ...selectedPredicates(state.franchise, (show: Show) => show.franchise),
    ...selectedPredicates(state.type, (show: Show) => show.type),
  );

  predicates.push(...showYearPredicates(state));

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
