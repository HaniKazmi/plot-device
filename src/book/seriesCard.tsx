import { useState } from "react";
import type { PanelStat, PanelSubtitlePart } from "../common/Card";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { CURRENT_PLAINDATE, formatDateRange } from "../common/date";
import { useHoverCardHold } from "../common/hoverCardHold";
import { stated } from "../common/population";
import { useScheme } from "../common/useScheme";
import { genreToColour, type Scheme } from "../utils/types";
import BookCardMediaImage, { BookPanelCard } from "./CardMediaImage";
import { bookScoreChip, bookStatListSharedProps, bySeriesThenStart } from "./drilldown";
import { bookKey, daysReading, statsCardLabelFinished, type SeriesSpan } from "./statsData";
import "../utils/arrayUtils";

/**
 * Who wrote the series and what it is, asked of the whole span rather than read off the book
 * fronting it.
 *
 * Every one of the sheet's 64 series carries one writer and one genre today, so both branches
 * answer with the single name — but nothing in the model holds them to it, and the fronting book
 * is chosen by date rather than by agreeing with its siblings. A series continued by another hand
 * would otherwise be attributed under the series title to whoever wrote its first book, stated as
 * flatly as if the span agreed.
 *
 * The genre swatch is the colour the bar itself is drawn in, so it is shown only where every book
 * carries that genre: one swatch over a series spanning two claims something the books do not
 * share, and the count says what the bar's own colour then cannot.
 */
const seriesSubtitle = (span: SeriesSpan, scheme: Scheme): PanelSubtitlePart[] => {
  const authors = new Set(span.books.map((book) => book.author));
  const genres = new Set(span.books.map((book) => book.genre));

  return [
    { text: authors.size === 1 ? span.lead.author : `${authors.size} authors` },
    genres.size === 1
      ? { text: span.lead.genre, swatch: genreToColour(span.lead.genre, scheme) }
      : { text: `${genres.size} genres` },
  ];
};

/**
 * The figures under a series bar.
 *
 * A span holding one book is a book and not a series — a quarter of the library is drawn that way,
 * every book the sheet named no series for — so it states what the book's own card states. "1
 * Books" is a tile carrying nothing, and it displaces the score and the days in hand, which are
 * facts about the read the reader is actually looking at.
 *
 * Hours are summed raw and kept to a decimal, as the sheet records them: `bookTotals` floors for
 * the vitals cards, where a fraction of an hour across a library is noise, but on one span it is
 * the whole value — a novella logged at 0.9 floors to nothing, which reads as hours never logged.
 */
const seriesStats = (span: SeriesSpan): PanelStat[] => {
  if (span.books.length === 1) {
    const days = daysReading(span.lead, CURRENT_PLAINDATE);
    return [
      ...(span.lead.score !== undefined ? [{ value: span.lead.score, label: "Score" }] : []),
      { value: span.lead.pages, label: "Pages" },
      ...(days !== undefined ? [{ value: days, label: "Days" }] : []),
    ];
  }

  const hours = Math.round(span.books.sum("hours") * 10) / 10;

  return [
    { value: span.books.length, label: "Books" },
    { value: span.books.sum("pages"), label: "Pages" },
    ...(hours ? [{ value: hours, label: "Hours" }] : []),
  ];
};

/**
 * The card a hovered series bar shows: the cover the series is fronted by, the series' own name,
 * the span it was read over, and its figures.
 *
 * Its own component rather than the book card under a borrowed title, which is what the Shows card
 * does for a combined show — a `Show` carries rolled-up episodes and minutes, so that card stays
 * honest, where one book's Pages and Score under a series name would be the tile saying something
 * false that this tab drops a tile rather than print.
 *
 * Its own module rather than beside the book card, because `book/module.lazy.ts` re-exports that
 * file and `app/mediaLazy.ts` reaches it statically: anything there is downloaded on every visit
 * to every tab. This card is drawn by the Books timeline alone, which is in the chunk this module
 * lands in.
 */
export const BookSeriesHoverCard = ({ span }: { span: SeriesSpan }) => {
  const scheme = useScheme();
  const hold = useHoverCardHold();
  const [listed, setListed] = useState(false);

  // A span of one book opens that book's own card, which `CardMediaImage` gives it for nothing and
  // which is honest here: the span and the book are the same thing. Past one, the picture stands
  // for the whole series, so it opens the series instead — and `onOpen` is what says so.
  const many = span.books.length > 1;

  // `onOpen` returns before `CardMediaImage` reaches its own hold, so a dialog opened through it
  // from inside a hover card's popper is unmounted with that popper the moment the pointer leaves
  // for the backdrop. The card opening a layer of its own takes the hold itself.
  const open = () => {
    hold.hold();
    setListed(true);
  };

  const close = () => {
    setListed(false);
    hold.release();
  };

  return (
    <>
      <BookPanelCard
        item={span.lead}
        title={span.name}
        subtitle={seriesSubtitle(span, scheme)}
        dateRange={formatDateRange(span.lead.startDate, span.end)}
        stats={seriesStats(span)}
        onOpen={many ? open : undefined}
        // What the press opens, since the card's own picture and words name the book fronting the
        // series rather than the series — the one thing pressing it does not open.
        openLabel={many ? `Open ${span.name}, ${stated(span.books.length, "books")}` : undefined}
      />
      {listed && (
        <DrilldownDialog
          title={span.name}
          onClose={close}
          // The order and the card the Most Read band's own series drill-down uses: a series
          // opened from the timeline reads as the same series opened from there.
          content={span.books.toSorted(bySeriesThenStart)}
          cardKey={bookKey}
          labelComponent={statsCardLabelFinished}
          chipComponent={(book) => bookScoreChip(book, scheme)}
          MediaComponent={BookCardMediaImage}
          {...bookStatListSharedProps}
        />
      )}
    </>
  );
};
