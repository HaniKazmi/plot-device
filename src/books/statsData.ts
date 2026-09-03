import { daysSince, formatDate, type YearMonthDay, type YearNumber } from "../common/date";
import { format } from "../utils/mathUtils";
import { releaseDecade, scoreBand } from "../utils/types";
import { earliestYear as earliestYearOf, groupByCategory, realFranchisesOnly } from "../common/statsData";
import type { Book, BookGroup, Measure } from "./types";
import "../utils/arrayUtils";

/**
 * The categories the Top list offers, in the order its select box shows them.
 *
 * The order is load-bearing beyond presentation: `TopList` turns a category's index into a
 * Highcharts palette offset, so reordering this recolours those charts.
 */
export const bookTopOptions = [
  "genre",
  "author",
  "franchise",
  "series",
  "format",
  "score",
  "status",
  "decade",
] as const;

export type BookTopOption = (typeof bookTopOptions)[number];

/**
 * A grouping's value for one book, worded the way a card should read it. This is the single
 * definition of the two derived keys — decade and score band — so the sunburst, barchart, Top band
 * and drill-down cannot come to disagree about which bucket a book is in.
 */
export const bookGroupValue = (book: Book, key: Exclude<BookGroup, "none">): string => {
  switch (key) {
    case "decade":
      return releaseDecade(book.releaseDate.year);
    case "score":
      return scoreBand(book.score);
    default:
      return book[key];
  }
};

/**
 * How much a set of books counts for under the active measure — the one home of the hours floor.
 * Pages and books are whole numbers already; hours are the sheet's decimal estimates, summed
 * exactly and floored once here rather than per book.
 */
export const measureOf = (books: Book[], measure: Measure) => {
  switch (measure) {
    case "Hours":
      return Math.floor(books.sum("hours"));
    case "Pages":
      return books.sum("pages");
    case "Books":
      return books.length;
  }
};

/**
 * Groups books by a category, ordered by the measure, largest first. The artwork scan is a reduce
 * rather than a sort: only the longest read is wanted to front the group.
 */
export const groupBooksBy = (data: Book[], key: BookTopOption, measure: Measure) =>
  groupByCategory(
    data,
    (book) => bookGroupValue(book, key),
    (books) => measureOf(books, measure),
    (books) => books.reduce((best, book) => (book.hours > best.hours ? book : best)),
    // A series of one is still honestly a series the sheet named; a franchise of one is a book
    // naming itself, which is the rule every franchise column in the app follows.
    key === "franchise" ? realFranchisesOnly : undefined,
  );

/** The three figures the vitals cards state, over whatever set the caller scopes. */
export const bookTotals = (data: Book[]) => ({
  books: data.length,
  hours: Math.floor(data.sum("hours")),
  pages: data.sum("pages"),
});

/**
 * Totals for the books begun in `year` — the field the year filter reads, so the card and the
 * filter answer the same question. The year is a parameter rather than read from the clock, so
 * the numbers are a function of the data alone.
 */
export const booksInYear = (data: Book[], year: YearNumber) =>
  bookTotals(data.filter((book) => book.startDate.year === year));

/**
 * Books, hours and pages per year, averaged over the years anything was begun. Years with nothing
 * logged are absent rather than counted as zero, so the average is over active years.
 */
export const yearlyAverages = (data: Book[]) => {
  const years = new Set(data.map((book) => book.startDate.year));
  const count = years.size || 1;
  return {
    books: Math.round((data.length / count) * 10) / 10,
    hours: Math.floor(data.sum("hours") / count),
    pages: Math.round(data.sum("pages") / count),
  };
};

/**
 * Pages, hours and days over the books actually finished. A book still open has no days to
 * average and its hours are still climbing, so it is left out of all three rather than out of one.
 */
export const perBookAverages = (data: Book[]) => {
  const finished = data.filter((book) => book.endDate);
  const count = finished.length;
  return {
    pages: count ? Math.round(finished.sum("pages") / count) : 0,
    hours: count ? Math.round((finished.sum("hours") / count) * 10) / 10 : 0,
    days: count ? Math.round(finished.sum("numDays") / count) : 0,
  };
};

/**
 * Every book still being read, most recently started first — so the first entry is the one a
 * page leading with a single book should lead with.
 */
export const currentlyReading = (data: Book[]) =>
  data.filter((book) => book.status === "Reading").sortByKey("startDate");

/**
 * How long a book has been, or was, in hand: the sheet's own day count once it is finished, and
 * the days since it was begun while it is not. One helper so the hero, the hover card and the
 * expanded card cannot count the same read three ways.
 */
export const daysReading = (book: Book, today: YearMonthDay): number | undefined =>
  book.endDate ? book.numDays : daysSince(book.startDate, today);

/**
 * The figures the hero carries about the book it is showing.
 *
 * They are the book's own and not the library's: the totals live in the cards below the hero.
 * Every tile is conditional on the sheet holding what it reports — a book just opened may have no
 * hours logged, an unscored book has no score, and a standalone has no place in a series — and a
 * tile reading zero says something false where saying nothing says the truth.
 *
 * The tab's own hero has the width for all of them. The Omnibus's Now band seats the panel in a
 * column beside the cover, which holds two tiles and wraps a third under them, so `"card"` keeps
 * the two that say most about a book in hand — how long it has had, and the hours it has taken or
 * the pages it runs to where no hours are logged yet.
 */
export const bookHeroStats = (book: Book, today: YearMonthDay, variant: "hero" | "card") => {
  const days = daysReading(book, today);
  const daysTile = days !== undefined ? [{ label: book.endDate ? "Days" : "Days In", value: days }] : [];

  if (variant === "card") {
    return [book.hours ? { label: "Hours", value: book.hours } : { label: "Pages", value: book.pages }, ...daysTile];
  }

  const stats: { label: string; value: number | string }[] = [];

  if (book.score !== undefined) stats.push({ label: "Score", value: `${book.score}/10` });
  if (book.hours) stats.push({ label: "Hours", value: book.hours });
  stats.push(...daysTile);
  stats.push({ label: "Pages", value: book.pages });

  if (book.series && book.seriesNumber !== undefined) {
    stats.push({ label: book.series, value: `#${book.seriesNumber}` });
  }

  return stats;
};

/**
 * What tells one book's card from another's in a list. The title alone collides on a reread,
 * which the sheet records as a second row, and the start date is what separates those.
 */
export const bookKey = (book: Book) => `${book.name}-${book.startDate}`;

/**
 * The first year a book was begun in: the floor the year select offers and the January every card
 * strip opens on. The sheet is a sample of a library still being entered, which is why it is read
 * rather than fixed.
 */
export const earliestYear = (data: readonly Book[]): YearNumber => earliestYearOf(data, (book) => book.startDate.year);

// Dates are in the reader's voice and not the machine's, which is the same one the card behind
// the thumbnail speaks. One cell per row: these sit under covers a third the width of the banners
// the other tabs label, and two cells collide into one run of digits.
export const statsCardLabelFinished = (book: Book) => [
  [book.endDate ? formatDate(book.endDate) : "In progress"],
  [`${format(book.pages)} pages`],
];

export const statsCardLabelPages = (book: Book) => [[`${format(book.pages)} pages`], [`${format(book.hours)} hours`]];
