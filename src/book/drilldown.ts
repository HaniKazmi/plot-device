import type { GridListLayout, StatListBaseProps } from "../common/Stats";
import { scoreBand, scoreBandToColour, type Scheme } from "../utils/types";
import type { Book } from "./types";

/**
 * How this tab lists a group of books, wherever one is opened.
 *
 * Two surfaces drill into a group of books — the Most Read band's cards and the timeline's series
 * bars — and a series opened from one has to read as the series opened from the other: the same
 * order, the same badge, the same card size. Written at each of them instead, the two drift into
 * two answers for one group.
 */

/**
 * Each series together and in its own order, then everything by start date: a group that holds
 * two numbered series — an author's, a franchise's — reads one series through before the next
 * rather than interleaving their firsts, seconds and thirds. Standalones sort after the series,
 * since the empty series name sorts before every real one only under an ascending compare, and a
 * numbered entry before an unnumbered one because `Infinity` stands in for a number.
 */
export const bySeriesThenStart = (a: Book, b: Book) => {
  if (a.series !== b.series) return a.series === "" ? 1 : b.series === "" ? -1 : a.series.localeCompare(b.series);
  const byNumber = (a.seriesNumber ?? Infinity) - (b.seriesNumber ?? Infinity);
  if (byNumber) return byNumber;
  return a.startDate === b.startDate ? 0 : a.startDate.lte(b.startDate) ? -1 : 1;
};

/** The corner badge: the book's score, wearing its band's fill. Unscored books carry none. */
export const bookScoreChip = (book: Book, scheme: Scheme) =>
  book.score !== undefined
    ? { label: String(book.score), colour: scoreBandToColour(scoreBand(book.score), scheme) }
    : undefined;

export const bookStatListSharedProps: Pick<StatListBaseProps<Book>, "shape" | "divider" | "width"> & GridListLayout = {
  // Covers, not banners — the cards keep the shape the library grid shows them at.
  shape: "cover",
  divider: true,
  // Two cards to the band, each half the row at `md`, and three covers to a row inside it, so the
  // shell's six is two full rows and each cover stands near the size the wall draws it at.
  width: [12, 12, 6],
  pictureWidth: [6, 4, 4],
  dialogPictureWidth: [6, 3, 2],
};

/**
 * The same cards as a fullscreen list, for a surface that opens `DrilldownDialog` itself.
 *
 * `DrilldownDialog` reads one `pictureWidth`, where `StatList` reads a second for its dialog, so a
 * caller handing it the strip's spans lays the drilled list out at the collapsed card's size. The
 * translation `GroupedStatList` does at its own call site is written once here instead, and the
 * shape is stated rather than spread from the list's, which carries fields the dialog would take
 * the wrong way round.
 */
export const bookDrilldownProps = {
  shape: bookStatListSharedProps.shape,
  pictureWidth: bookStatListSharedProps.dialogPictureWidth,
} as const;
