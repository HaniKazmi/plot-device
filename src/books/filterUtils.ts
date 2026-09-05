import { CURRENT_YEAR } from "../common/date";
import type { Book, Measure } from "./types";
import { createFilterReducer, type BaseFilterState, type FilterDispatchFor } from "../common/filterReducer";
import { bookFilters } from "./filters";

export interface FilterState extends BaseFilterState<Book, Measure> {
  /** Off leaves only scored books, so the score views stop counting books nobody rated. */
  unscored: boolean;
  genre: string[];
  author: string[];
  franchise: string[];
  series: string[];
  format: string[];
}

export type FilterDispatch = FilterDispatchFor<FilterState>;

/**
 * Guest mode pushes nothing here: nothing on the Books sheet marks a book as adult-themed the way
 * the games and shows sheets do, so there is nothing for the mode to hide.
 */
export const {
  store: pageState,
  useFilterReducer,
  filters,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<Book, Measure, FilterState>({
  schema: bookFilters,
  initial: { measure: "Books", yearType: "upto", yearTo: CURRENT_YEAR },
  // A book counts to the year it was begun, which is the year the vitals cards and the timeline
  // both place it in.
  yearOf: (book) => book.startDate.year,
});
