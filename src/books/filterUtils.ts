import { CURRENT_YEAR } from "../common/date";
import type { Predicate } from "../utils/types";
import type { Book, Measure } from "./types";
import {
  createFilterReducer,
  selectedPredicates,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
} from "../common/filterReducer";

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
 * Guest mode pushes no predicate: nothing on the Books sheet marks a book as adult-themed the way
 * the games and shows sheets do, so there is nothing for the mode to hide here.
 */
export const filters = (state: Omit<FilterState, "filter">): Predicate<Book> => {
  const predicates: Predicate<Book>[] = [];

  if (!state.unscored) predicates.push((book) => book.score !== undefined);

  predicates.push(
    ...selectedPredicates(state.genre, (book: Book) => book.genre),
    ...selectedPredicates(state.author, (book: Book) => book.author),
    ...selectedPredicates(state.franchise, (book: Book) => book.franchise),
    ...selectedPredicates(state.series, (book: Book) => book.series),
    ...selectedPredicates(state.format, (book: Book) => book.format),
  );

  // The shared predicate reads `startDate.year`: a book counts to the year it was begun, which is
  // the year the vitals cards and the timeline both place it in.
  predicates.push(...yearPredicates<Book>(state));

  return (book: Book) => predicates.every((p) => p(book));
};

/** Books → Hours → Pages → Books, the one three-way cycle in the app. */
export const nextMeasure = (measure: Measure): Measure =>
  measure === "Books" ? "Hours" : measure === "Hours" ? "Pages" : "Books";

export const { useFilterReducer, reducer, initialState } = createFilterReducer<Book, Measure, FilterState>(
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
    guestMode: false,
  },
  filters,
  nextMeasure,
);
