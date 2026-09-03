import { useSelectBox } from "../common/SelectBoxHook";
import { groupToColour, type Book, type BookGroup, type Measure } from "./types";
import Barchart from "../common/Barchart";
import { bookGroupValue } from "./statsData";
import { format } from "../utils/mathUtils";
import { useScheme } from "../common/useScheme";
import type { YearType } from "../common/filterReducer";

type Option = Exclude<BookGroup, "name">;

const options: Option[] = ["none", "genre", "author", "franchise", "series", "format", "score", "status", "decade"];

/**
 * Which year a book counts under. Read is the tab's own axis; Released redraws the same library as
 * a chart of publishing history, which only a tab recording a release date decades from its start
 * date can ask.
 */
const axisOptions = ["Read", "Released"] as const;

const BookBarchart = ({ data, measure, yearType }: { data: Book[]; measure: Measure; yearType: YearType }) => {
  const scheme = useScheme();

  // Grouped by genre from the start — the one distinction this tab is about.
  const [group, groupControls] = useSelectBox(options, "genre");
  const [axis, axisControls] = useSelectBox(axisOptions, "Read");

  const barchartData = (cumulative: boolean) =>
    data.map((book) => {
      const date = axis === "Read" ? book.startDate : book.releaseDate;
      return {
        // Months only where the reader is inside one year or watching a total climb; a released
        // axis is decades wide and a month there is noise.
        date: (cumulative || yearType === "matching") && axis === "Read" ? date.toYearMonth() : date.toYear(),
        colour: groupToColour(group, book, scheme),
        name: group === "none" ? "" : bookGroupValue(book, group) || book.name,
        value: measure === "Books" ? 1 : measure === "Pages" ? book.pages : book.hours,
      };
    });

  return (
    <Barchart
      // The title follows the axis select, or the chart lies about what its x-axis means.
      title={`${measure} by ${axis === "Read" ? "year read" : "release year"}`}
      count={`${format(data.length)} books`}
      data={barchartData}
      // Exact hours reach the shell, so the share view divides the real figures; the column that
      // is drawn is floored the way every hours total on the tab is.
      postAggregate={measure === "Hours" ? Math.floor : undefined}
      controls={
        <>
          {axisControls}
          {groupControls}
        </>
      }
    />
  );
};

export default BookBarchart;
