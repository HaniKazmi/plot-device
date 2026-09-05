import type { MediumModule, OmniItem } from "../common/medium";
import { bookEntry, bookSpan } from "./cardData";
import { bookDataConfig } from "./converter";
import { pageState } from "./filterUtils";
import { bookItemKey } from "./statsData";
import { bookFranchise } from "./franchiseContext";
import type { Book, Measure } from "./types";

/** The units the tab counts in, in the rail. */
export const MEASURES: readonly Measure[] = ["Books", "Pages", "Hours"];

/** A book as one row of the union. */
const bookItems = (books: Book[]): OmniItem[] =>
  books.map((book): OmniItem => ({
    medium: "book",
    // The tuple the tab keys a card by: a reread is a second row with the same title, and the
    // day it was begun separates the two.
    key: bookItemKey(book),
    name: book.name,
    closeDate: book.endDate,
    year: (book.endDate ?? book.startDate).year,
    hours: book.hours,
    genre: book.genre,
    genres: [],
    franchise: book.franchise,
    source: book,
  }));

export const bookModule: MediumModule<Book> = {
  medium: "book",
  tabId: "books",
  noun: "books",
  data: bookDataConfig,
  // Nothing on the Books sheet marks a book for guest mode to hide, so the whole library is
  // visible in it. Stated as a predicate rather than as an absence, so the mode is applied the
  // same way for four media and no caller has to test whether a medium has a rule.
  guestFilter: () => true,
  franchiseOf: bookFranchise,
  toOmniItems: bookItems,
  entry: bookEntry,
  span: bookSpan,
  // The column is new to the sheet, and a book the sheet has not reached yet has no picture to
  // stand on a wall — the same absence a game without a banner already answers.
  banner: (book) => book.banner || undefined,
  title: (book) => book.name,
  // Title and release, as a film's work is: a reread joins the first reading.
  work: (book) => `${book.name}-${book.releaseDate}`,
  secondaryText: (book) => [book.author, book.series],
  facts: (book) => [book.author, book.status, book.pages ? `${book.pages} pages` : ""].filter(Boolean).join(" · "),
  measures: MEASURES,
  pageState,
  load: () => import("./module.lazy"),
};
