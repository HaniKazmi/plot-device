import { useSelectBox } from "../common/SelectBoxHook";
import { groupToColour, videoGameOptions, type Measure, type VideoGame, type VideoGameStringKeys } from "./types";
import Barchart from "../common/Barchart";
import { Year } from "../common/date";
import type { YearType } from "./filterUtils";

const options: Readonly<VideoGameStringKeys | "none">[] = ["none", ...videoGameOptions];

const VgBarchart = ({ data, measure, yearType }: { data: VideoGame[]; measure: Measure; yearType: YearType }) => {
  const [group, controls] = useSelectBox(options, "company");
  const barchartData = (cumulative: boolean) =>
    data.flatMap((game) => {
      const value = measure === "Games" ? 1 : game.hours;
      if (!value) return [];

      return {
        date:
          cumulative || yearType === "matching"
            ? game.startDate instanceof Year
              ? game.startDate.firstDay().toYearMonth()
              : game.startDate.toYearMonth()
            : game.startDate.toYear(),
        colour: groupToColour(group, game),
        name: group === "none" ? "" : game[group],
        value,
      };
    });

  return (
    <Barchart
      data={barchartData}
      title={`${measure} by year`}
      controls={controls}
    />
  );
};

export default VgBarchart;
