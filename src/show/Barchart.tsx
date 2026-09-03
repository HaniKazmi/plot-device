import { useSelectBox } from "../common/SelectBoxHook";
import { groupToColour, typeToName, type Measure, type Season, type Show, type ShowStringKeys } from "./types";
import Barchart from "../common/Barchart";
import { format } from "../utils/mathUtils";
import { useScheme } from "../common/useScheme";
import type { YearType } from "../common/filterReducer";

type Option = ShowStringKeys | "none";

const options: Option[] = ["none", "name", "status", "type", "genre", "network", "rating", "franchise"];

const optionToName = (season: Season, option: Option) => {
  switch (option) {
    case "none":
      return "";
    case "type":
      return typeToName(season.show.type);
    default:
      return season.show[option];
  }
};

const ShowBarchart = ({ data, measure, yearType }: { data: Show[]; measure: Measure; yearType: YearType }) => {
  const scheme = useScheme();

  // Grouped by status from the start, so the columns are born carrying the one distinction the
  // tab is about — what is still running against what is done — rather than a single flat colour
  // the reader has to open a select box to break apart.
  const [group, controls] = useSelectBox(options, "status");
  const barchartData = (cumulative: boolean) =>
    data
      .flatMap((show) => show.s)
      .map((season) => ({
        // "In {year}" keeps a *show* here if any one season started that year — the predicate
        // above states the count in shows, not seasons — so every season the show ever ran still
        // reaches this flatMap, not only the one that matched. Months under `matching` therefore
        // draw a long-running show's whole history at month width rather than narrowing to the
        // named year, the same population the year view already drew, only wider.
        date: cumulative || yearType === "matching" ? season.startDate.toYearMonth() : season.startDate.toYear(),
        colour: groupToColour(group, season.show, scheme),
        name: optionToName(season, group),
        value: measure === "Episodes" ? season.e : season.minutes,
      }));

  return (
    <Barchart
      title={`${measure === "Episodes" ? "Episodes" : "Hours"} by year`}
      // The shows behind the columns rather than the seasons the chart is fed, which is the unit
      // the tab's other sections count in and the one its Sunburst neighbour states.
      count={`${format(data.length)} shows`}
      data={barchartData}
      postAggregate={measure === "Hours" ? (minutes) => Math.floor(minutes / 60) : undefined}
      controls={controls}
    />
  );
};

export default ShowBarchart;
