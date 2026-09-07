import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { yearPredicates, type YearType } from "../common/filterReducer";
import type { Book } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE, type YearMonthDay, type YearNumber } from "../common/date";
import { BookHoverCard } from "./CardMediaImage";
import { BookSeriesHoverCard } from "./seriesCard";
import { useScheme } from "../common/useScheme";
import { stated } from "../common/population";
import { genreToColour } from "../utils/types";
import { bookKey, lastEnd, seriesSpans } from "./statsData";

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
 * finished days to years apart, which is what makes it a bar rather than a mark on a ribbon. The
 * converter holds every date to a full one, so there is no year-only floor to apply here.
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
  const scheme = useScheme();

  const [bar, setBar] = useState<Bar>("book");
  const groupData = bar === "series";

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

  const bookData: TimelineData[] = groupData
    ? seriesSpans(library)
        // Series are built over the whole library rather than over what the filters left: a bar
        // named for a series has to answer for the series, and grouped after filtering a genre
        // narrowing silently shortens the span, moves the book its colour and cover come from, and
        // states a count for a series it has taken books out of. It is the rule `Graphs` already
        // applies to the franchise index and the card strips' epoch. Which spans are drawn is
        // still the filters' answer.
        .filter((span) => span.books.some((book) => shown.has(book)))
        .map((span) => ({ span, drawn: span.books.filter((book) => begun(book) && inScope(book)) }))
        // A series whose every read is out of scope, or has not begun, has no span to draw — where
        // one book of it is in scope, that book is what there is to show.
        .filter(({ drawn }) => drawn.length > 0)
        .map(({ span, drawn }) =>
          toBar({
            key: span.key,
            name: span.name,
            tooltip: () => <BookSeriesHoverCard span={span} />,
            // The book that opens the series, so the bar's colour is the genre of the read it
            // begins with — the same book whose cover fronts the card behind it.
            colour: genreToColour(span.lead.genre, scheme),
            // The extent is the reads in scope, not the series': the year scope says which stretch
            // of time the chart is about, so a series reaching past it would carry the axis and the
            // year rail with it and draw a range the reader asked not to see. A genre narrowing is
            // the other kind of choice and leaves the span whole.
            start: drawn[0].startDate,
            end: lastEnd(drawn),
          }),
        )
    : data.filter(begun).map((book) =>
        toBar({
          key: bookKey(book),
          name: book.name,
          tooltip: () => <BookHoverCard item={book} />,
          colour: genreToColour(book.genre, scheme),
          start: book.startDate,
          end: book.endDate,
        }),
      );

  return (
    <Timeline data={bookData}>
      <SectionHeader
        icon={<TimelineIcon />}
        title={groupData ? "Every series" : "Every read"}
        // Both readings state one, because neither is the page's own population: a bar per book
        // differs from it by this chart's future-start floor, and a bar per series is a figure
        // nothing else on the tab counts — 401 books are 88 series here.
        //
        // That figure counts a book the sheet named no series for as a series of its own, which is
        // what this chart draws it as. The Series filter and the Most Read band both drop a blank
        // instead, so they offer 64 where this says 88: one library, two readings of the word, and
        // this is the surface that states it as a number.
        count={stated(bookData.length, groupData ? "series" : "books")}
        // The control the Shows timeline offers the same choice through, and the one the charts'
        // views and the wall's density are chosen with: a small closed set where the reading in
        // hand has to be readable at a glance.
        action={
          <SegmentedControl
            options={BARS}
            value={bar}
            onChange={setBar}
            ariaLabel="One bar per"
          />
        }
      />
    </Timeline>
  );
};

export default BookTimeline;
