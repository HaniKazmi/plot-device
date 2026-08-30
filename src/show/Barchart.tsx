import { useSelectBox } from "../common/SelectBoxHook";
import { groupToColour, type Measure, type Season, type Show, type ShowStringKeys } from "./types";
import Barchart from "../common/Barchart";
import { format } from "../utils/mathUtils";

type Option = ShowStringKeys | "anime" | "none";

const options: Option[] = ["none", "name", "status", "anime"];

const optionToName = (season: Season, option: Option) => {
  switch (option) {
    case "none":
      return "";
    case "anime":
      return season.show.anime ? "Anime" : "Western";
    default:
      return season.show[option];
  }
};

const ShowBarchart = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  // Grouped by status from the start, so the columns are born carrying the one distinction the
  // tab is about — what is still running against what is done — rather than a single flat colour
  // the reader has to open a select box to break apart.
  const [group, controls] = useSelectBox(options, "status");
  const barchartData = (cumulative: boolean) =>
    data
      .flatMap((show) => show.s)
      .map((season) => ({
        date: cumulative ? season.startDate.toYearMonth() : season.startDate.toYear(),
        colour: groupToColour(group, season.show),
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
