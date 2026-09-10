import type { YearMonthDay } from "../common/date";
import {
  decadeToColour,
  formatToColour,
  franchiseToColour,
  genreToColour,
  releaseDecade,
  scoreBand,
  scoreBandToColour,
  statusToColour,
  type Colour,
  type FormatName,
  type KeysMatching,
  type Scheme,
} from "../utils/types";

/**
 * The two states a book is in. Both are members of the shared `ColourableStatus` union, where they
 * take the fills Playing/Watching and Beat/Ended already wear — in progress and done are one state
 * each across the media, whatever word a sheet uses for them.
 */
export const BOOK_STATUSES = ["Reading", "Finished"] as const;

export type Status = (typeof BOOK_STATUSES)[number];

export const isStatus = (value: string): value is Status => (BOOK_STATUSES as readonly string[]).includes(value);

/**
 * How a book was read, and the four words the converter accepts in that cell.
 *
 * A subset of the shared `FORMAT_NAMES` (`utils/types.ts`), which spans the Games column too: this
 * is what a *book* can be, so the converter rejects a row calling one Pirated where it still knows
 * which row that is. Web Serial is the one of the four the sheet's own dropdown does not yet
 * offer — 413 rows are Physical, 67 eBook and 2 Audiobook — and a vocabulary already holding it is
 * what lets the first serialised read arrive as a row rather than as a code change.
 */
export const FORMATS = ["eBook", "Audiobook", "Physical", "Web Serial"] as const satisfies readonly FormatName[];

export type Format = (typeof FORMATS)[number];

export const isFormat = (value: string): value is Format => (FORMATS as readonly string[]).includes(value);

export interface Book {
  name: string;
  author: string;
  /** A book with no wider franchise carries its own name here, as a film does on the Movies sheet. */
  franchise: string;
  /**
   * The series inside the franchise — Mistborn inside Cosmere — or `""` where the book stands
   * alone. Blank rather than the book's own name, unlike `franchise`: a series is a grouping the
   * ledger and the drill-down name, and a one-book series naming itself would be a row saying the
   * title twice.
   */
  series: string;
  /** Its place in `series`, absent for a standalone or a collection the sheet does not number. */
  seriesNumber?: number;
  genre: string;
  status: Status;
  format: Format;
  /** Absent for a book never scored, which is not the same as scoring one zero. */
  score?: number;
  releaseDate: YearMonthDay;
  startDate: YearMonthDay;
  /** Absent while the book is still being read. */
  endDate?: YearMonthDay;
  /** Start to end, absent while there is no end. */
  numDays?: number;
  pages: number;
  /**
   * Hours spent reading, as the sheet's own estimate: the logged sessions where Kindle recorded
   * them, and pages over the reader's measured rate where it did not. Decimal, and kept so — a
   * novella read in ninety minutes is one and a half hours, and flooring it would erase it.
   * Printed through `roundHours`: the sheet's figure carries five decimals, and "166.595" is a
   * tile stating a precision no estimate has.
   */
  hours: number;
  /** A full URL to the cover, as the other three sheets' Artwork columns hold their own. */
  artwork: string;
}

type BookStringKeys = Exclude<KeysMatching<Book, string>, "artwork">;

/**
 * Books, hours or pages. Three rather than the two the other tabs cycle, because a page count is
 * the one figure every row carries natively — hours are an estimate for a third of the library,
 * where the sheet's own Reading Rate tab is built on pages.
 */
export type Measure = "Books" | "Pages" | "Hours";

/**
 * What the charts can group by: the string fields plus two derivations — the release decade and
 * the score band. "score" here means the band, since a select box shows these words and
 * "scoreBand" is nobody's vocabulary.
 */
export type BookGroup = BookStringKeys | "none" | "decade" | "score";

/**
 * The format table is `utils/types.ts`' own, because the Games sheet writes the same column: a
 * paperback and a disc are both Physical and wear one terracotta, and an eBook and a storefront
 * download are one screen blue under each sheet's own word for it. Re-exported so this tab's
 * filter chips, ledger swatch and format band read it where they read every other book colour.
 */
export { formatToColour } from "../utils/types";

export const groupToColour = (group: BookGroup, book: Book, scheme: Scheme): Colour => {
  switch (group) {
    case "genre":
      // The ramp every tracked sheet shares, so one hue means one genre on every tab.
      return genreToColour(book.genre, scheme);
    case "status":
      return statusToColour(book, scheme);
    case "format":
      return formatToColour(book.format, scheme);
    case "score":
      return scoreBandToColour(scoreBand(book.score), scheme);
    case "decade":
      return decadeToColour(releaseDecade(book.releaseDate.year), scheme);
    case "franchise":
      // The table `utils/types.ts` shares with the other three tabs. Most books name themselves in
      // this column and take the empty answer.
      return franchiseToColour(book, scheme);
    default:
      // An author, a series and a title are open sets of names with no brand to reproduce, so ""
      // hands the choice to Highcharts.
      return "" as Colour;
  }
};

/** An hours estimate as it is printed: one decimal, the sheet's own figure carrying five. */
export const roundHours = (hours: number) => Math.round(hours * 10) / 10;
