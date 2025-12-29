import { useSelectBox } from "../common/SelectBoxHook";
import { groupToColour, type Measure, type VideoGame, type VideoGameStringKeys } from "./types";
import Barchart from "../common/Barchart";
import { Year, type YearMonth } from "../common/date";
import type { YearType } from "./filterUtils";
import type { Colour } from "../utils/types";

const options: Readonly<VideoGameStringKeys | "none">[] = [
  "none",
  "company",
  "name",
  "format",
  "franchise",
  "platform",
  "developer",
  "publisher",
  "rating",
  "status",
  "genre",
];

const VgBarchart = ({ data, measure, yearType }: { data: VideoGame[]; measure: Measure; yearType: YearType }) => {
  const [group, controls] = useSelectBox(options, "company");
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
      controls={controls}
    />
  );
};

export default VgBarchart;
