import { CardHeader, FormControlLabel, FormGroup, Stack, Switch } from "@mui/material";
import { useState } from "react";
import { SelectBox } from "./SelectionComponents";
import { Measure, VideoGame, VideoGameStringKeys, companyToColor } from "./types";
import Barchart from "../common/Barchart";

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

const VgBarchart = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [group, setGroup] = useState<VideoGameStringKeys | "none">("company");
  const [cumulative, setCumulative] = useState(false);
  let [stack, setStack] = useState(true);

  const grouped = groupDate(data, group, measure, cumulative);

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

export interface Grouped {
  [key: string]: {
    color: string;
    data: Record<string, number>;
  };
}

const groupDate = (
  data: VideoGame[],
  group: VideoGameStringKeys | "none",
  measure: Measure,
  cumulative: boolean
): Grouped => {
  const grouped = data.reduce((tree, game) => {
    const groupVal = group === "none" ? "" : game[group];
    const year = cumulative ? game.startDate?.toISOString().substring(0, 7) : game.startDate?.getFullYear().toString();
    if (!year || !game.hours) return tree;

    tree[groupVal] ??= { color: group === "company" ? companyToColor(game) : "", data: {} };
    tree[groupVal].data[year] = (tree[groupVal].data[year] || 0) + (measure === "Count" ? 1 : game.hours);
    return tree;
  }, {} as Grouped);

  return grouped;
};

export default VgBarchart;
