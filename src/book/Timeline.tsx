import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import type { Book } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE, type YearMonthDay } from "../common/date";
import { BookHoverCard } from "./CardMediaImage";
import { BookSeriesHoverCard } from "./seriesCard";
import { useScheme } from "../common/useScheme";
import { stated } from "../common/population";
import { genreToColour } from "../utils/types";
import { bookKey, seriesSpans } from "./statsData";

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
const BookTimeline = ({ data, library }: { data: Book[]; library: Book[] }) => {
  const scheme = useScheme();

  const [bar, setBar] = useState<Bar>("book");
  const groupData = bar === "series";

  // A start typed ahead of today has nothing to draw: a span runs from its first start to today at
  // the latest, so a whole series queued ahead would give `start` after `end`, and `daysTo` throws
  // on a pair the wrong way round.
  const started = library.filter((book) => book.startDate.lte(CURRENT_PLAINDATE));
  // What the page's filters left, as the keys the wall and every list already tell books apart by.
  const shown = new Set(data.map(bookKey));

  // Series are built over the whole library and then drawn where the filters left something in
  // them, rather than built over what the filters left. A bar named for a series has to answer for
  // the series: grouped after filtering, a genre narrowing silently shortens the span, moves its
  // first book — and with it the bar's colour and the cover fronting its card — and states a book
  // count for a series it has taken books out of. It is the rule `Graphs` already applies to the
  // franchise index and the card strips' epoch, both built from the unfiltered library.
  const bookData: TimelineData[] = groupData
    ? seriesSpans(started)
        .filter((span) => span.books.some((book) => shown.has(bookKey(book))))
        .map((span) =>
          toBar({
            key: span.key,
            name: span.name,
            tooltip: () => <BookSeriesHoverCard span={span} />,
            // The book that opens the span, so the bar's colour is the genre of the read it begins
            // with — the same book whose cover fronts the card behind it.
            colour: genreToColour(span.lead.genre, scheme),
            start: span.lead.startDate,
            end: span.end,
          }),
        )
    : started
        .filter((book) => shown.has(bookKey(book)))
        .map((book) =>
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
