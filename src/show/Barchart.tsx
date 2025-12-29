import { useSelectBox } from "../common/SelectBoxHook";
import { groupToColour, type Measure, type Season, type Show, type ShowStringKeys } from "./types";
import Barchart from "../common/Barchart";

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
  const [group, controls] = useSelectBox(options, "none");
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
      title={measure === "Episodes" ? "Episodes Watched" : "Hours Watched"}
      data={barchartData}
      dataPostProcess={
        measure === "Hours" ? (data) => data.map((row) => row.map((el) => (el ? Math.floor(el / 60) : el))) : undefined
      }
      controls={controls}
    />
  );
};

export default ShowBarchart;
