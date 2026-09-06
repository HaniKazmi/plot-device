import { CURRENT_YEAR, type YearNumber } from "../common/date";
import { earliestYear as earliestYearOf } from "../common/statsData";
import { createFilterReducer, type BaseFilterState, type FilterDispatchFor } from "../common/filterReducer";
import { omniFilters } from "./filters";
import type { OmniItem } from "../common/medium";
import type { Measure } from "../app/types";

export interface FilterState extends BaseFilterState<OmniItem, Measure> {
  /** One switch per medium: the page's whole point is comparing them, so any subset is a view. */
  game: boolean;
  show: boolean;
  movie: boolean;
  book: boolean;
  genre: string[];
  franchise: string[];
  /** Certificate *bands*, this page holding two boards' notations for one tier. */
  certificate: string[];
}

export type FilterDispatch = FilterDispatchFor<FilterState>;

/**
 * What this tab counts in, and the word its population is counted as.
 *
 * Beside the reducer rather than in the charts that draw them, because the box standing above the
 * tabs draws this page's measure and states its population for whichever tab is open, and a tab
 * with no `MediumModule` to carry them has to state them somewhere the composing layer can reach.
 * Not a `noun` off a module, the four being composed here: a row of the union is a game, a season,
 * a film or a book, and the only word true of all four is the one the measure control offers beside
 * it.
 */
export const MEASURES: readonly Measure[] = ["Hours", "Items"];
export const NOUN = "items";

/**
 * The first year the union holds anything in, which is the floor the year picker offers: the four
 * sheets start in different years, and the union's floor is whichever of them starts first.
 */
export const earliestYear = (items: readonly OmniItem[]): YearNumber => earliestYearOf(items, (item) => item.year);

/**
 * Guest mode pushes nothing here. It is applied per library by each domain's own rule before the
 * union is built (`visibleLibrary`), because the Now band elects from the domain records and would
 * otherwise headline a title the charts had already hidden.
 */
export const {
  store: pageState,
  useFilterReducer,
  filters,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<OmniItem, Measure, FilterState>({
  schema: omniFilters,
  initial: {
    // Hours is the unit the three media are actually comparable in. Items equates a hundred-hour
    // game with a two-hour film, which is a real question but not the one the page opens on.
    measure: "Hours",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
  },
  // The attribution year: an `OmniItem` holds no start date, and a game played across a new year
  // counts to the year it was finished, which is already on the record.
  yearOf: (item) => item.year,
});
