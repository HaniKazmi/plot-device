import type { LedgerRow, PanelSubtitlePart } from "../common/Card";
import { FRANCHISE_KEY } from "../common/filterSchema";
import { linked } from "../common/ledgerRow";
import { seriesRow } from "../common/series";
import type { FranchiseEntry } from "../common/franchiseUnion";
import { spanUntil } from "../common/medium";
import type { ReactNode } from "react";
import { formatDate, formatDateRange, type YearMonthDay } from "../common/date";
import {
  certificateToColour,
  franchiseToColour,
  genreToColour,
  mediumFills,
  statusToColour,
  type Scheme,
} from "../utils/types";
import { bookItemKey } from "./statsData";
import { formatToColour, type Book } from "./types";

/**
 * How a book is named wherever it is promoted: the format it was read in, who wrote it, then the
 * genre — the venue first, as every medium's hero names its own, and the format and the genre
 * wearing the swatches their ledger rows and bands wear.
 *
 * Shared rather than assembled at each site, so the hero and the hover card cannot come to name
 * one book two ways.
 */
export const bookSubtitle = (book: Book, scheme: Scheme): PanelSubtitlePart[] => [
  { text: book.format, swatch: formatToColour(book.format, scheme) },
  ...bookCredit(book, scheme),
];

/**
 * The subtitle less its format, for the Omnibus's Now card, which names a book by who wrote it as
 * the card beside it names a film by who directed it.
 */
export const bookCredit = (book: Book, scheme: Scheme): PanelSubtitlePart[] => [
  { text: book.author },
  { text: book.genre, swatch: genreToColour(book.genre, scheme) },
];

/** The span a book was read over, in the reader's voice, running to "present" while it is open. */
export const readRange = (book: Book): string => formatDateRange(book.startDate, book.endDate);

/**
 * The facts that are not figures.
 *
 * A row carries a swatch exactly where the app speaks that field's colour somewhere else — the
 * genre, the certificate and the status share the other tabs' vocabularies, the format the Games
 * tab's.
 */
export const bookRows = (book: Book, scheme: Scheme): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Read", value: readRange(book) },
    { label: "Released", value: formatDate(book.releaseDate) },
    { label: "By", ...linked("author", book.author) },
    {
      label: "Genre",
      ...linked("genre", book.genre),
      swatch: genreToColour(book.genre, scheme),
    },
    {
      label: "Format",
      ...linked("format", book.format),
      swatch: formatToColour(book.format, scheme),
    },
    {
      label: "Certificate",
      ...linked("certificate", book.certificate),
      swatch: certificateToColour(book.certificate, scheme),
    },
    { label: "Status", value: book.status, swatch: statusToColour(book, scheme) },
  ];

  const series = seriesRow(book);
  if (series) rows.push(series);

  // Every book stands in a franchise, a standalone in one of its own name, and the row is the way to its
  // page either way. Unknown franchises fall through to an empty colour, which is no swatch
  // rather than a black one — the table names the couple of dozen the app draws.
  rows.push({
    label: "Franchise",
    ...linked(FRANCHISE_KEY, book.franchise),
    swatch: franchiseToColour(book, scheme) || undefined,
  });

  return rows;
};

/**
 * A book in a franchise strip's vocabulary. One mapper for the tab's own index and the union.
 */
export const bookEntry = (book: Book, today: YearMonthDay, hoverCard: () => ReactNode): FranchiseEntry => ({
  key: bookItemKey(book),
  subject: bookItemKey(book),
  franchise: book.franchise,
  medium: "book",
  fill: mediumFills.book,
  label: book.name,
  ...spanUntil(book, today),
  hoverCard,
});
