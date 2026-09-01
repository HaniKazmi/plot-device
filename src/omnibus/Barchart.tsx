import Barchart from "../common/Barchart";
import { useSelectBox } from "../common/SelectBoxHook";
import { format } from "../utils/mathUtils";
import type { OmniItem } from "./adapter";
import { BARCHART_SPLITS, omniBarchartRows } from "./barchartData";
import type { Measure } from "./types";

/**
 * The union year by year, split by whichever vocabulary the reader picks.
 *
 * Medium is what the page opens on and the reason it exists — a game, a season and a film are
 * comparable as media and little else. The other two are the vocabularies the gallery already
 * shelves by, and the select is what puts them on a time axis: what a genre is made of is a
 * question the page answers in three places, and this is the one place answering *when*.
 *
 * It is also what makes the shell's four views worth having here. Share and Rank divide a column
 * between its series, and three series is a bar in two pieces and a bump chart of three flat
 * lines; a dozen genres or five certificates is the shape those views were built for.
 */
const OmnibusBarchart = ({ data, measure }: { data: OmniItem[]; measure: Measure }) => {
  const [split, controls] = useSelectBox(BARCHART_SPLITS, "medium");
  // Built once and both plotted and counted, because a split can drop a row whose column the sheet
  // has not filled in yet — a header counting what went in would overstate what came out.
  const rows = omniBarchartRows(data, measure, split);

  return (
    <Barchart
      title={`${measure} by year`}
      count={`${format(rows.length)} items`}
      // The year is the same in every view, so the argument the shell passes is not read: an item's
      // year is an attribution rather than a date, and a month-grained curve would invent one.
      data={() => rows}
      // Floored per column rather than per item, which is the rule every hours figure on this tab
      // follows. Share bypasses this by design and takes its percentages from the exact hours.
      postAggregate={measure === "Hours" ? Math.floor : undefined}
      controls={controls}
    />
  );
};

export default OmnibusBarchart;
