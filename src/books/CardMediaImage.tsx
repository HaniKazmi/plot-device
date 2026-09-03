import { Typography } from "@mui/material";
import {
  CardDetailBody,
  CardMediaImage,
  CardPanel,
  TimelineCard,
  TypedCardMediaImage,
  type CardStat,
  type LedgerRow,
} from "../common/Card";
import { formatToColour, type Book } from "./types";
import {
  franchiseToColour,
  genreToColour,
  scoreBand,
  scoreBandToColour,
  statusToColour,
  type Scheme,
} from "../utils/types";
import { namesTheSameThing } from "../utils/stringUtils";
import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { buildStrip, stripYearTicks } from "../common/timelineStripData";
import { bookSubtitle, readRange, seriesLabel } from "./cardData";
import { useBookEpoch, useFranchiseBooks } from "./franchiseContext";
import { bookKey, daysReading } from "./statsData";
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

/**
 * The facts that are not figures.
 *
 * A row carries a swatch exactly where the app speaks that field's colour somewhere else — the
 * genre and the status share the other tabs' vocabularies, the format has this tab's own.
 */
const bookRows = (book: Book, scheme: Scheme): LedgerRow[] => {
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

const BookCardDetail = ({ item }: { item: Book }) => {
  const scheme = useScheme();

  return (
    <CardDetailBody
      strip={<BookTimelineCard item={item} />}
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
 * The franchise's reads on one strip — each book a band from its start to its end, the book in
 * hand running to today — so a series read across a decade shows its gaps. Standalone books get
 * no strip at all: one band on a decade says nothing.
 *
 * `buildStrip` places bands by date, so the strip runs in reading order whatever `# in Series`
 * says; the number is the drill-down's order, not the strip's.
 */
const BookTimelineCard = ({ item }: { item: Book }) => {
  const scheme = useScheme();

  const siblings = useFranchiseBooks(item);
  const epoch = useBookEpoch();

  // Before the strip is built, not after: most books are standalones, and a strip laid out to be
  // thrown away is the cost of every one of their expanded cards.
  if (siblings.length < 2) return null;

  const { bands, laneCount } = buildStrip(
    siblings.map((book) => ({
      key: bookKey(book),
      start: book.startDate,
      end: book.endDate ?? CURRENT_PLAINDATE,
      book,
    })),
    epoch,
    CURRENT_PLAINDATE,
  );

  if (bands.length === 0) return null;

  return (
    <TimelineCard
      bands={bands.map((band) => ({
        ...band,
        colour: genreToColour(band.book.genre, scheme),
        muted: band.book !== item,
        tooltip: <ReadTooltip book={band.book} />,
      }))}
      laneCount={laneCount}
      ticks={stripYearTicks(epoch, CURRENT_PLAINDATE)}
      caption={`${item.franchise} · ${siblings.length} books · ${epoch.year} – today`}
    />
  );
};

const ReadTooltip = ({ book }: { book: Book }) => (
  <>
    <Typography
      variant="h6"
      align="center"
    >
      {book.name}
    </Typography>
    <Typography>{book.endDate ? `Read ${readRange(book)}` : `Reading since ${formatDate(book.startDate)}`}</Typography>
    {book.score !== undefined && <Typography>Scored {book.score}/10</Typography>}
    <Typography>{book.pages} Pages</Typography>
  </>
);

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
