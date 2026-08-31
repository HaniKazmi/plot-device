import Barchart from "../common/Barchart";
import { format } from "../utils/mathUtils";
import type { OmniItem } from "./adapter";
import { omniBarchartRows } from "./barchartData";
import type { Measure } from "./types";

/**
 * The three media against each other, year by year.
 *
 * No grouping control: the medium *is* the grouping, and it is the only vocabulary this tab
 * teaches. The shell's own Totals · Share · Cumulative · Rank control is what the section is
 * actually read through — Share is the one that answers "what was this year made of", which is
 * the question three libraries on one axis exist for.
 */
const OmnibusBarchart = ({ data, measure }: { data: OmniItem[]; measure: Measure }) => (
  <Barchart
    title={`${measure} by year`}
    count={`${format(data.length)} items`}
    // The year is the same in every view, so the argument the shell passes is not read: an item's
    // year is an attribution rather than a date, and a month-grained curve would invent one.
    data={() => omniBarchartRows(data, measure)}
    // Floored per column rather than per item, which is the rule every hours figure on this tab
    // follows. Share bypasses this by design and takes its percentages from the exact hours.
    postAggregate={measure === "Hours" ? Math.floor : undefined}
    controls={null}
  />
);

export default OmnibusBarchart;
