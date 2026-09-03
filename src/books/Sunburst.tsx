import { useState } from "react";
import { groupToColour, type Book, type BookGroup, type Measure } from "./types";
import Sunburst, { SunBurstControls } from "../common/Sunburst";
import { bookGroupValue } from "./statsData";
import { format } from "../utils/mathUtils";
import { useScheme } from "../common/useScheme";

type OptionKeys = Exclude<BookGroup, "none"> | "startDate";

/**
 * Genre → author → series: what it is, who wrote it, which run of theirs — the hierarchy this
 * library's questions nest in. Author leads the second ring rather than the first because the
 * genre ring is five wedges and the author ring is dozens, and a chart is read from the centre out.
 */
const BookSunburst = ({ data, measure }: { data: Book[]; measure: Measure }) => {
  const scheme = useScheme();

  const [controlStates, setControlStates] = useState<OptionKeys[]>(["genre", "author", "series"]);

  return (
    <Sunburst
      title={`Where the ${measure.toLowerCase()} went`}
      count={`${format(data.length)} books`}
      data={data}
      groups={controlStates}
      options={{
        keyToVal: (book, key) => {
          switch (key) {
            case "startDate":
              return book.startDate.yearString();
            case "name":
              return book.name;
            default:
              // The derived keys share one definition with the Top band and the drill-down, so a
              // book cannot land in different buckets per chart. A blank series or franchise falls
              // to the book's own name, which is what a standalone is.
              return bookGroupValue(book, key) || book.name;
          }
        },
        // Hours are the sheet's decimal estimates and are passed exactly: the shell sums them, and
        // flooring per book would erase every read under an hour from the chart.
        getCount: ({ hours, pages }) => (measure === "Hours" ? hours || undefined : measure === "Pages" ? pages : 1),
        getColor: (book, firstGroup) =>
          firstGroup === "startDate" ? undefined : groupToColour(firstGroup, book, scheme) || undefined,
        getLeafName: (book) => book.name,
      }}
      controls={
        <SunBurstControls
          options={options}
          controlStates={controlStates}
          setControlStates={setControlStates}
        />
      }
    />
  );
};

const options: OptionKeys[] = [
  "genre",
  "author",
  "franchise",
  "series",
  "format",
  "score",
  "status",
  "decade",
  "startDate",
  "name",
];

export default BookSunburst;
