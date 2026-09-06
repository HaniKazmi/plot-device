import { createContext, useContext } from "react";
import { CURRENT_YEAR, YearMonthDay } from "../common/date";
import { createFranchiseContext } from "../common/franchiseContext";
import { earliestYear } from "./statsData";
import type { Book } from "./types";

/**
 * The raw column, deliberately — not erased where it repeats the book's own name, because the
 * first book of a series usually shares it: "Revelation Space" opens the Revelation Space series.
 * Whether a franchise is real is a property of the group, not the book, and every consumer tests
 * the group's size.
 */
export const bookFranchise = (book: Book) => book.franchise;

const { FranchiseContext, useFranchiseItems } = createFranchiseContext<Book>();

/** Franchise siblings for the card strip, provided by the tab that already holds the data. */
export { FranchiseContext };

/**
 * The books sharing this book's franchise, itself included, or the book alone — the answer for a
 * standalone book and for a card rendered with no index above it.
 */
export const useFranchiseBooks = (book: Book) => useFranchiseItems(book, bookFranchise);

/**
 * Where every card strip's scale opens: the January of the earliest start in the library.
 *
 * Read from the data rather than fixed the way the Movies epoch is, because the sheet is a sample
 * of a library still being entered and nothing says its earliest read will stay where it is —
 * `buildStrip` clamps a span that begins before the epoch flat against the left edge, drawn as if
 * it started there. One value for the whole tab, threaded down as context because a card is
 * rendered wherever a book is, and the strip inside it has to draw on the same scale as every
 * other card's.
 */
export const bookEpoch = (data: readonly Book[]) => YearMonthDay.get(earliestYear(data), 1, 1);

const BookEpochContext = createContext<YearMonthDay>(YearMonthDay.get(CURRENT_YEAR, 1, 1));

export const BookEpochProvider = BookEpochContext.Provider;

export const useBookEpoch = () => useContext(BookEpochContext);
