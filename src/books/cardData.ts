import type { LedgerRow, PanelSubtitlePart } from "../common/Card";
import type { FranchiseEntry } from "../common/franchiseUnion";
import type { ReactNode } from "react";
import { formatDate, formatDateRange, type YearMonthDay } from "../common/date";
import { franchiseToColour, genreToColour, mediumFills, statusToColour, type Scheme } from "../utils/types";
import { bookItemKey } from "./statsData";
import { namesTheSameThing } from "../utils/stringUtils";
import { formatToColour, type Book } from "./types";

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

/**
 * The facts that are not figures.
 *
 * A row carries a swatch exactly where the app speaks that field's colour somewhere else — the
 * genre and the status share the other tabs' vocabularies, the format has this tab's own.
 */
export const bookRows = (book: Book, scheme: Scheme): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Read", value: readRange(book) },
    { label: "Released", value: formatDate(book.releaseDate) },
    { label: "By", value: book.author },
    { label: "Genre", value: book.genre, swatch: genreToColour(book.genre, scheme) },
    { label: "Format", value: book.format, swatch: formatToColour(book.format, scheme) },
    { label: "Status", value: book.status, swatch: statusToColour(book, scheme) },
  ];

  if (book.series) rows.push({ label: "Series", value: seriesLabel(book) });

  // A standalone book carries its own name in the column, so the row appears only where it names
  // something the book belongs to rather than the book over again. Unknown franchises fall
  // through to an empty colour, which is no swatch rather than a black one.
  if (!namesTheSameThing(book.franchise, book.name))
    rows.push({ label: "Franchise", value: book.franchise, swatch: franchiseToColour(book, scheme) || undefined });

  return rows;
};

/**
 * A book in a franchise strip's vocabulary; the book in hand runs to today. One mapper for the
 * tab's own index and the Omnibus union.
 */
export const bookEntry = (book: Book, today: YearMonthDay, hoverCard: () => ReactNode): FranchiseEntry => ({
  key: bookItemKey(book),
  subject: bookItemKey(book),
  franchise: book.franchise,
  medium: "book",
  fill: mediumFills.book,
  label: book.name,
  start: book.startDate,
  end: book.endDate ?? today,
  precise: true,
  hoverCard,
});
