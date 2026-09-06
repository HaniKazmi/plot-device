import { Timeline as TimelineIcon } from "@mui/icons-material";
import type { ReactNode } from "react";
import { SectionHeader } from "../common/SectionHeader";
import type { Book } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE } from "../common/date";
import { BookHoverCard } from "./CardMediaImage";
import { useScheme } from "../common/useScheme";
import { stated } from "../common/population";
import { genreToColour } from "../utils/types";
import { bookKey } from "./statsData";

/**
 * Every read as a packed span, the chart Games draws for playthroughs: a book is begun and
 * finished days to years apart, which is what makes it a bar rather than a mark on a ribbon. The
 * converter holds every date to a full one, so there is no year-only floor to apply here.
 */
const BookTimeline = ({ data, empty }: { data: Book[]; empty?: ReactNode }) => {
  const scheme = useScheme();

  const bookData: TimelineData[] = data
    // A start typed ahead of today has no span to draw yet: an open book runs to today, and the
    // chart measures a span with `daysTo`, which throws on a pair the wrong way round.
    .filter((book) => book.startDate.lte(CURRENT_PLAINDATE))
    .map((book) => ({
      key: bookKey(book),
      name: book.name,
      tooltip: () => <BookHoverCard item={book} />,
      colour: genreToColour(book.genre, scheme),
      start: book.startDate,
      end: book.endDate ?? CURRENT_PLAINDATE,
    }));

  return (
    <Timeline
      data={bookData}
      empty={empty}
    >
      <SectionHeader
        icon={<TimelineIcon />}
        title="Every read"
        count={stated(bookData.length, "books")}
      />
    </Timeline>
  );
};

export default BookTimeline;
