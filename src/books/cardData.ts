import type { PanelSubtitlePart } from "../common/Card";
import { formatDateRange } from "../common/date";
import { genreToColour, type Scheme } from "../utils/types";
import type { Book } from "./types";

/**
 * How a book is named wherever it is promoted: who wrote it, then the genre, wearing the swatch
 * its ledger row and every genre wedge on the tab wear.
 *
 * Shared rather than assembled at each site, so the hero, the hover card and the Omnibus's Now
 * card cannot come to name one book two ways.
 */
export const bookSubtitle = (book: Book, scheme: Scheme): PanelSubtitlePart[] => [
  { text: book.author },
  { text: book.genre, swatch: genreToColour(book.genre, scheme) },
];

/**
 * Where a book sits in its series, worded the way a ledger row or a tile reads it: "#3 · Revelation
 * Space", or the series alone where the sheet did not number it. Empty for a standalone.
 */
export const seriesLabel = (book: Book): string =>
  book.series ? (book.seriesNumber !== undefined ? `#${book.seriesNumber} · ${book.series}` : book.series) : "";

/** The span a book was read over, in the reader's voice, running to "present" while it is open. */
export const readRange = (book: Book): string => formatDateRange(book.startDate, book.endDate);
