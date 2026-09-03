import type { YearMonthDay } from "../common/date";
import {
  decadeToColour,
  fill,
  franchiseToColour,
  genreToColour,
  NEUTRAL_FILL,
  pick,
  releaseDecade,
  scoreBand,
  scoreBandToColour,
  statusToColour,
  type Colour,
  type Fill,
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
 * How a book was read. The sheet's scope today is Kindle purchases, so every row says eBook; the
 * other two are what the sheet's own notes say is excluded "for now", and a vocabulary that
 * already holds them is what lets a physical book arrive as a row rather than as a code change.
 */
export const FORMATS = ["eBook", "Audiobook", "Physical"] as const;

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
   */
  hours: number;
  /** A full URL to the cover, as the other sheets' `Banner` columns hold theirs. */
  banner: string;
}

type BookStringKeys = Exclude<KeysMatching<Book, string>, "banner">;

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
 * One hue per format, placed at chroma 0.14 and solved to the fill contract on each paper: a
 * screen blue for eBook, a violet for Audiobook, a warm terracotta for Physical. Each pair is
 * over 15 dE from the others on its own paper except eBook and Audiobook on the dark, at 15.9 —
 * and every segment of the one band that draws them is labelled. The terracotta sits 13–14 from
 * the tab's own gold, which is the app bar and never a peer of a band segment.
 */
const formatColours: Record<Format, Fill> = {
  eBook: fill("#4898e6", "#63b0fc"),
  Audiobook: fill("#bf7bcf", "#d28ce1"),
  Physical: fill("#de7949", "#f28c5c"),
};

export const formatToColour = (format: string, scheme: Scheme): Colour =>
  pick(formatColours[format as Format] ?? NEUTRAL_FILL, scheme);

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
