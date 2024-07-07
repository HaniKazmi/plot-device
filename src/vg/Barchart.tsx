import { useState } from "react";
import { SelectBox } from "../common/SelectionComponents";
import { groupToColour, type Measure, type VideoGame, type VideoGameStringKeys } from "./types";
import Barchart from "../common/Barchart";
import { Year, YearMonth } from "../common/date";
import type { YearType } from "./filterUtils";
import type { Colour } from "../utils/types";

const options: Record<VideoGameStringKeys | "none", boolean> = {
  none: true,
  company: true,
  format: true,
  franchise: false,
  name: false,
  platform: true,
  developer: false,
  publisher: false,
  rating: true,
  status: true,
  genre: true,
};

const VgBarchart = ({ data, measure, yearType }: { data: VideoGame[]; measure: Measure; yearType: YearType }) => {
  const [group, setGroup] = useState<VideoGameStringKeys | "none">("company");
  const barchartData = (cumulative: boolean) =>
    data
      .map((game) => ({
        date:
          cumulative || yearType === "matching"
            ? game.startDate instanceof Year
              ? game.startDate.startOfYear().toYearMonth()
              : game.startDate.toYearMonth()
            : game.startDate.toYear(),
        colour: groupToColour(group, game),
        name: group === "none" ? "" : game[group],
        value: measure === "Games" ? 1 : game.hours,
      }))
      .filter(
        (vg: {
          date: Year | YearMonth;
          colour: Colour;
          name: string;
          value: number | undefined;
        }): vg is {
          date: Year | YearMonth;
          colour: Colour;
          name: string;
          value: number;
        } => !!vg.value,
      );

  return (
    <Barchart
      data={barchartData}
      title={`${measure} Played`}
      controls={
        <SelectBox
          options={Object.keys(options) as (VideoGameStringKeys | "none")[]}
          value={group}
          setValue={setGroup}
        />
      }
    />
  );
};

export default VgBarchart;
