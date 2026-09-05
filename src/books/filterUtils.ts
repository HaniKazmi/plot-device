import { CURRENT_YEAR } from "../common/date";
import type { Predicate } from "../utils/types";
import type { Book, Measure } from "./types";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
} from "../common/filterReducer";
import { schemaPredicates } from "../common/filterSchema";
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
 * The tab's predicate: every per-field rule the schema states, and then the year scope, which
 * belongs to no field and is a reading of the whole page rather than a narrowing of it.
 *
 * Guest mode pushes nothing: nothing on the Books sheet marks a book as adult-themed the way the
 * games and shows sheets do, so there is nothing for the mode to hide here.
 */
export const filters = (state: Omit<FilterState, "filter">): Predicate<Book> => {
  // The shared cutoff reads `startDate.year`: a book counts to the year it was begun, which is the
  // year the vitals cards and the timeline both place it in.
  const predicates: Predicate<Book>[] = [...schemaPredicates(bookFilters, state), ...yearPredicates<Book>(state)];

  return (book: Book) => predicates.every((p) => p(book));
};

export const {
  store: pageState,
  useFilterReducer,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<Book, Measure, FilterState>(
  {
    unscored: true,
    genre: [],
    author: [],
    franchise: [],
    series: [],
    format: [],
    measure: "Books",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
  },
  filters,
);
