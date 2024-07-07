import { useState } from "react";
import { SelectBox } from "../common/SelectionComponents";
import { groupToColour, type Measure, type Show, type ShowStringKeys } from "./types";
import Barchart from "../common/Barchart";

const options: Record<ShowStringKeys | "none", boolean> = {
  name: false,
  status: true,
  none: false,
};

const ShowBarchart = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const [group, setGroup] = useState<ShowStringKeys | "none">("none");
  const barchartData = (cumulative: boolean) =>
    data
      .flatMap((show) => show.s)
      .map((season) => ({
        date: cumulative ? season.startDate.toYearMonth() : season.startDate.toYear(),
        colour: groupToColour(group, season.show),
        name: group === "none" ? "" : season.show[group],
        value: measure === "Episodes" ? season.e : season.minutes,
      }));

  return (
    <Barchart
      title={measure === "Episodes" ? "Episodes Watched" : "Hours Watched"}
      data={barchartData}
      dataPostProcess={
        measure === "Hours" ? (data) => data.map((row) => row.map((el) => (el ? Math.floor(el / 60) : el))) : undefined
      }
      controls={
        <SelectBox options={Object.keys(options) as (ShowStringKeys | "none")[]} value={group} setValue={setGroup} />
      }
    />
  );
};

export default ShowBarchart;
