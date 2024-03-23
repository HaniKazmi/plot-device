import { CardHeader, FormControlLabel, FormGroup, Stack, Switch } from "@mui/material";
import { useState } from "react";
import { SelectBox } from "./SelectionComponents";
import { companyToColor, Measure, VideoGame, VideoGameStringKeys } from "./types";
import Barchart, { Grouped } from "../common/Barchart";
import { YearType } from "./filterUtils";

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

const VgBarchart = ({ data, measure, yearType }: { data: VideoGame[]; measure: Measure, yearType: YearType }) => {
  const [group, setGroup] = useState<VideoGameStringKeys | "none">("company");
  const [cumulative, setCumulative] = useState(false);
  const [stack, setStack] = useState(true);

  const grouped = groupDate(data, group, measure, cumulative, yearType);

  return (
    <Barchart grouped={grouped} cumulative={cumulative} stack={stack}>
      <CardHeader
        title={measure === "Count" ? "Games Played" : "Hours Played"}
        action={
          <FormGroup>
            <SelectBox
              options={Object.keys(options) as (VideoGameStringKeys | "none")[]}
              value={group}
              setValue={setGroup}
            />
            <Stack direction={"row"}>
              <FormControlLabel
                label="Cumulative"
                control={<Switch checked={cumulative} onChange={(_, checked) => setCumulative(checked)} />}
              />
              <FormControlLabel
                label="Stack"
                control={<Switch checked={stack} onChange={(_, checked) => setStack(checked)} disabled={cumulative} />}
              />
            </Stack>
          </FormGroup>
        }
      />
    </Barchart>
  );
};

const groupDate = (
  data: VideoGame[],
  group: VideoGameStringKeys | "none",
  measure: Measure,
  cumulative: boolean,
  yearType: YearType,
): Grouped => {
  return data.reduce((tree, game) => {
    const groupVal = group === "none" ? "" : game[group];
    const year = cumulative || yearType == "exact" ? game.startDate?.toISOString().substring(0, 7) : game.startDate?.getFullYear().toString();
    if (!year || !game.hours) return tree;

    tree[groupVal] ??= { color: group === "company" ? companyToColor(game) : "", data: {} };
    tree[groupVal].data[year] = (tree[groupVal].data[year] || 0) + (measure === "Count" ? 1 : game.hours);
    return tree;
  }, {} as Grouped);
};

export default VgBarchart;
