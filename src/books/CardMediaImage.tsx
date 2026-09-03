import { CardDetailBody, CardMediaImage, CardPanel, TypedCardMediaImage, type CardStat } from "../common/Card";
import type { Book } from "./types";
import { mediumFills, scoreBand, scoreBandToColour, type Scheme } from "../utils/types";
import { CURRENT_PLAINDATE, type YearMonthDay } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { FranchiseStrip, type StripMode } from "../common/FranchiseStrip";
import { useFranchiseUnion, type FranchiseEntry } from "../common/franchiseUnion";
import { bookRows, bookSubtitle, readRange } from "./cardData";
import { useBookEpoch, useFranchiseBooks } from "./franchiseContext";
import { bookItemKey, daysReading } from "./statsData";
import { useScheme } from "../common/useScheme";

/**
 * The figures the card leads with. The score takes the coloured tile — it is the one figure with
 * a colour vocabulary — and is dropped entirely when the book was never scored: a tile reading
 * 0/10 says something false where saying nothing says the truth. Hours and days are dropped the
 * same way for a book just opened.
 */
const bookStats = (book: Book, scheme: Scheme): CardStat[] => {
  const days = daysReading(book, CURRENT_PLAINDATE);
  return [
    ...(book.score !== undefined
      ? [{ label: "Score", value: `${book.score}/10`, colour: scoreBandToColour(scoreBand(book.score), scheme) }]
      : []),
    { label: "Pages", value: book.pages },
    ...(book.hours ? [{ label: "Hours", value: book.hours }] : []),
    ...(days !== undefined ? [{ label: book.endDate ? "Days" : "Days In", value: days }] : []),
  ];
};

const BookCardDetail = ({ item }: { item: Book }) => {
  const scheme = useScheme();

  return (
    <CardDetailBody
      strip={<BookFranchiseStrip book={item} />}
      stats={bookStats(item, scheme)}
      rows={bookRows(item, scheme)}
    />
  );
};

const BookCardMediaImage: TypedCardMediaImage<Book> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={() => <BookCardDetail item={item} />}
    {...props}
  />
);

/**
 * The tab's own franchise in the strip's vocabulary, for the moment before the other three
 * libraries have landed. The book in hand runs to today.
 */
const bookEntries = (books: Book[], today: YearMonthDay): FranchiseEntry[] =>
  books.map((book) => ({
    key: bookItemKey(book),
    subject: bookItemKey(book),
    franchise: book.franchise,
    medium: "book",
    fill: mediumFills.book,
    label: book.name,
    start: book.startDate,
    end: book.endDate ?? today,
    precise: true,
    hoverCard: () => <BookHoverCard item={book} />,
  }));

/**
 * The book's franchise across every medium it was met in, with this book as the subject; nothing
 * for a standalone. The union answers once all four libraries are here, and the tab's own index
 * answers until then. The strip places its beads by date, so a series read out of order is drawn
 * in the order it was read; `# in Series` is the drill-down's order, not the strip's.
 */
export const BookFranchiseStrip = ({ book, mode }: { book: Book; mode?: StripMode }) => {
  const union = useFranchiseUnion(book.franchise);
  const own = useFranchiseBooks(book);
  const epoch = useBookEpoch();
  const entries = union ?? bookEntries(own, CURRENT_PLAINDATE);

  if (entries.length < 2) return null;

  return (
    <FranchiseStrip
      entries={entries}
      subject={bookItemKey(book)}
      franchise={book.franchise}
      epoch={epoch}
      today={CURRENT_PLAINDATE}
      mode={mode}
    />
  );
};

/**
 * The card a hovered bar shows: the artwork, what the book is, when it was read, and its figures.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card
 * for a book and a second assembly of it is a second thing to keep in step. The artwork takes the
 * cover shape, whose ratio is a reservation rather than a size (see `cardArrangement`).
 */
export const BookHoverCard = ({ item }: { item: Book }) => {
  const scheme = useScheme();

  const days = daysReading(item, CURRENT_PLAINDATE);

  return (
    <BookCardMediaImage
      item={item}
      landscape
      extractColour
      sx={hoverCardArtworkSx("cover")}
      footerComponent={
        <CardPanel
          layout="beside"
          title={item.name}
          subtitle={bookSubtitle(item, scheme)}
          dateRange={readRange(item)}
          stats={[
            ...(item.score !== undefined ? [{ value: item.score, label: "Score" }] : []),
            { value: item.pages, label: "Pages" },
            ...(days !== undefined ? [{ value: days, label: "Days" }] : []),
          ]}
        />
      }
    />
  );
};

export default BookCardMediaImage;
