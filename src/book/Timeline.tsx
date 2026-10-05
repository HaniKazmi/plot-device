import { useState } from "react";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useColourBy } from "../common/useColourBy";
import { yearPredicates, type YearType } from "../common/filterReducer";
import { groupToColour, type Book } from "./types";
import { TimelineSection } from "../common/TimelineSection";
import type { PicturePress, TimelineData } from "../common/timelineLayout";
import { CURRENT_PLAINDATE, type YearMonthDay, type YearNumber } from "../common/date";
import { pictureAtHeight } from "../common/cardArrangement";
import BookCardMediaImage, { BookHoverCard } from "./CardMediaImage";
import { BookSeriesHoverCard } from "./seriesCard";
import { stated } from "../common/population";
import { bookGroupValue, bookKey, lastEnd, seriesSpans } from "./statsData";
import { pageState } from "./filterUtils";

/**
 * What the timeline can be coloured by: every key the tab's own `groupToColour` answers, genre
 * first, as the wall's border and the genre band draw a book.
 */
const COLOUR_KEYS = ["genre", "status", "format", "score", "decade", "franchise"] as const;

/** A book read online as it was written, a chapter at a time over months or years. */
const isSerial = (book: Book) => book.format === "Web Serial";

const pictureOf = (book: Book) => (height: number, press: PicturePress) => (
  <BookCardMediaImage
    item={book}
    lazy
    sx={pictureAtHeight("cover", height)}
    {...press}
  />
);

/** What one bar stands for: a book, or a series with its books combined. */
type Bar = "book" | "series";

const BARS: readonly SegmentOption<Bar>[] = [
  { value: "book", label: "Books" },
  { value: "series", label: "Series" },
];

/**
 * One bar, with an open end resolved to today.
 *
 * The two readings source every other field differently — a span's name is its series' and a
 * book's is its own — so only this rule is shared, and it is the one that would drift silently:
 * a reading that resolved an open end some other way would draw bars the other reading disagrees
 * with, at no cost to the types.
 */
const toBar = (data: Omit<TimelineData, "end"> & { end?: YearMonthDay }): TimelineData => ({
  ...data,
  end: data.end ?? CURRENT_PLAINDATE,
});

/**
 * Every read as a packed span, the chart Games draws for playthroughs: a book is begun and
 * finished days to years apart, which is what makes it a bar rather than a mark on a ribbon.
 */
const BookTimeline = ({
  data,
  library,
  yearType,
  yearTo,
}: {
  data: Book[];
  library: Book[];
  yearType: YearType;
  yearTo: YearNumber;
}) => {
  const colour = useColourBy(
    COLOUR_KEYS,
    "genre",
    (book: Book, key, scheme) => groupToColour(key, book, scheme),
    (book, key) => bookGroupValue(book, key),
  );

  const [bar, setBar] = useState<Bar>("book");
  // Series are built over the whole library rather than over what the filters left: a bar named
  // for a series has to answer for the series, and grouped after filtering a genre narrowing
  // silently shortens the span, moves the book its colour and cover come from, and states a count
  // for a series it has taken books out of. It is the rule `Graphs` already applies to the
  // franchise index and the card strips' epoch. Which spans are drawn is still the filters' answer.
  const series = bar === "series" ? seriesSpans(library) : undefined;

  // A start typed ahead of today has nothing to draw: a bar runs to today at the latest, so a read
  // that has not begun would give a start after its end, and `daysTo` throws on a pair the wrong
  // way round.
  const begun = (book: Book) => book.startDate.lte(CURRENT_PLAINDATE);

  // The page's own year scope, through the rule the filter composes itself from, so the stretch of
  // time the chart draws and the stretch the reader asked for cannot be two different answers.
  const scope = yearPredicates({ yearType, yearTo }, (book: Book) => book.startDate.year);
  const inScope = (book: Book) => scope.every((holds) => holds(book));

  // The rows the page's filters left, held by identity: `data` is `library` filtered, so the rows
  // in it are the very objects the spans were grouped from. A key would have to tell two rows
  // sharing a title and a start date apart, which `bookKey` cannot.
  const shown = new Set(data);

  // Each bar with whether it is a web serial's, read online a chapter at a time over months or years
  // — which Stacked leaves out (below).
  const marks: { bar: TimelineData; serial: boolean }[] = series
    ? series
        .filter((span) => span.books.some((book) => shown.has(book)))
        .map((span) => ({ span, drawn: span.books.filter((book) => begun(book) && inScope(book)) }))
        // A series whose every read is out of scope, or has not begun, has no span to draw — where
        // one book of it is in scope, that book is what there is to show.
        .filter(({ drawn }) => drawn.length > 0)
        .map(({ span, drawn }) => ({
          serial: drawn.every(isSerial),
          bar: toBar({
            key: span.key,
            name: span.name,
            tooltip: () => <BookSeriesHoverCard span={span} />,
            // The book that opens the series, so the bar's colour is that of the read it begins
            // with — the same book whose cover fronts the card behind it.
            colour: colour.fill(span.lead),
            // The extent is the reads in scope, not the series': the year scope says which stretch
            // of time the chart is about, so a series reaching past it would carry the axis and the
            // year rail with it and draw a range the reader asked not to see. A genre narrowing is
            // the other kind of choice and leaves the span whole.
            start: drawn[0].startDate,
            end: lastEnd(drawn),
            open: drawn.some((book) => !book.endDate),
            picture: pictureOf(span.lead),
          }),
        }))
    : data.filter(begun).map((book) => ({
        serial: isSerial(book),
        bar: toBar({
          key: bookKey(book),
          name: book.name,
          tooltip: () => <BookHoverCard item={book} />,
          colour: colour.fill(book),
          start: book.startDate,
          end: book.endDate,
          open: !book.endDate,
          picture: pictureOf(book),
        }),
      }));
  const bookData = marks.map(({ bar }) => bar);

  // A year of Stacked is one row where nothing in it overlaps, which is how a year of books reads:
  // one at a time. A web serial breaks that in every year it ran — Worm through 2013, Ward from 2017
  // into 2020, each running for months beside the books read alongside it — and opens a second lane
  // in all of them, halving every band's height, so the stack of years leaves serials to Across,
  // where a row of their own is what the packing gives them anyway.
  const stackedData = marks.filter(({ serial }) => !serial).map(({ bar }) => bar);

  return (
    <TimelineSection
      title={series ? "Every series" : "Every read"}
      // Both readings state one, because neither is the page's own population: a bar per book
      // differs from it by this chart's future-start floor, and a bar per series is a figure
      // nothing else on the tab counts — 401 books are 88 series here.
      //
      // That figure counts a book the sheet named no series for as a series of its own, which is
      // what this chart draws it as. The Series filter and the Most Read band both drop a blank
      // instead, so they offer 64 where this says 88: one library, two readings of the word, and
      // this is the surface that states it as a number.
      count={stated(bookData.length, series ? "series" : "books")}
      data={bookData}
      stacked={{
        data: stackedData,
        // What the stack draws, and why it is fewer where it is.
        count:
          stackedData.length < bookData.length
            ? `${stated(stackedData.length, series ? "series" : "books")} · no web serials`
            : undefined,
        // A year is one row, 24px of it, so a read long enough for its title can carry the name.
        labelled: true,
      }}
      controls={
        <>
          {/* The control the Shows timeline offers the same choice through: a small closed set
              where the reading in hand has to be readable at a glance. */}
          <SegmentedControl
            options={BARS}
            value={bar}
            onChange={setBar}
            ariaLabel="One bar per"
          />
        </>
      }
      // The books whose colours the bars wear, which is what the key names.
      colourKey={colour.colourKey(series ? series.map((span) => span.lead) : data)}
      yearType={yearType}
      yearTo={yearTo}
      dispatch={pageState.dispatch}
      shape="cover"
      // Books are read one at a time, so Across packs the library into a single lane four screens
      // wide, where a month-long read is a sliver whose name is cut to its first letter. Stacked
      // gives each year a row on one screen with every name that fits written on its band.
      initialLayout="Stacked"
    />
  );
};

export default BookTimeline;
