import {
  CardDetailBody,
  CardMediaImage,
  CardPanel,
  TypedCardMediaImage,
  type CardStat,
  type PanelStat,
  type PanelSubtitlePart,
} from "../common/Card";
import { roundHours, type Book } from "./types";
import { scoreBand, scoreBandToColour, type Scheme } from "../utils/types";
import { CURRENT_PLAINDATE, type YearMonthDay } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { FranchiseStrip, type StripVariant } from "../common/FranchiseStrip";
import { useFranchiseUnion, type FranchiseEntry } from "../common/franchiseUnion";
import { bookEntry, bookRows, bookSubtitle, readRange } from "./cardData";
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
    ...(book.hours ? [{ label: "Hours", value: roundHours(book.hours) }] : []),
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
    image={item.artwork}
    detailComponent={() => <BookCardDetail item={item} />}
    {...props}
  />
);

/**
 * The tab's own franchise in the strip's vocabulary, for the moment before the other three
 * libraries have landed, through the mapper the union draws with.
 */
const bookEntries = (books: Book[], today: YearMonthDay): FranchiseEntry[] =>
  books.map((book) => bookEntry(book, today, () => <BookHoverCard item={book} />));

/**
 * The book's franchise across every medium it was met in, with this book as the subject; nothing
 * for a standalone. The union answers once all four libraries are here, and the tab's own index
 * answers until then. The strip places its beads by date, so a series read out of order is drawn
 * in the order it was read; `Series #` is the drill-down's order, not the strip's.
 */
export const BookFranchiseStrip = ({ book, variant }: { book: Book; variant?: StripVariant }) => {
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
      variant={variant}
    />
  );
};

/**
 * The shape every hover card on this tab takes: the cover at the hover card's own size, and the
 * panel beside it.
 *
 * One shell rather than one per card, because the tab shows two — a book's, and the series bar's
 * on the timeline — and what varies between them is the words, not the chrome. Written twice, the
 * artwork shape and the panel's layout drift apart between two cards a reader flips between with
 * one control.
 *
 * `onOpen` is for a card whose picture stands for more than the book whose cover it shows: given,
 * `CardMediaImage` never opens that book's own dialog, and the caller owns what does open. The
 * artwork takes the cover shape, whose ratio is a reservation rather than a size (see
 * `cardArrangement`).
 */
export const BookPanelCard = ({
  item,
  title,
  subtitle,
  dateRange,
  stats,
  onOpen,
  openLabel,
}: {
  item: Book;
  title: string;
  subtitle: PanelSubtitlePart[];
  dateRange: string;
  stats: PanelStat[];
  onOpen?: () => void;
  openLabel?: string;
}) => (
  <BookCardMediaImage
    item={item}
    landscape
    extractColour
    sx={hoverCardArtworkSx("cover")}
    onOpen={onOpen}
    openLabel={openLabel}
    footerComponent={
      <CardPanel
        layout="beside"
        title={title}
        subtitle={subtitle}
        dateRange={dateRange}
        stats={stats}
      />
    }
  />
);

/**
 * The card a hovered bar shows: the artwork, what the book is, when it was read, and its figures.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card
 * for a book and a second assembly of it is a second thing to keep in step.
 */
export const BookHoverCard = ({ item }: { item: Book }) => {
  const scheme = useScheme();

  const days = daysReading(item, CURRENT_PLAINDATE);

  return (
    <BookPanelCard
      item={item}
      title={item.name}
      subtitle={bookSubtitle(item, scheme)}
      dateRange={readRange(item)}
      stats={[
        ...(item.score !== undefined ? [{ value: item.score, label: "Score" }] : []),
        { value: item.pages, label: "Pages" },
        ...(days !== undefined ? [{ value: days, label: "Days" }] : []),
      ]}
    />
  );
};

export default BookCardMediaImage;
