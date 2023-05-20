import { Card, CardContent, CardHeader, FormControlLabel, FormGroup, Switch } from "@mui/material";
import { useState } from "react";
import { CURRENT_MONTH, CURRENT_YEAR } from "../utils/dateUtils";
import Plot from "../plotly"
import { SelectBox } from "./SelectionComponents";
import { Measure, VideoGame, VideoGameStringKeys } from "./types";

const options: Record<VideoGameStringKeys | "none", boolean> = {
  none: true,
  company: true,
  format: true,
  franchise: false,
  name: false,
  platform: true,
  publisher: false,
  rating: true,
  status: true,
  genre: true
};

const Barchart = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [group, setGroup] = useState<VideoGameStringKeys | "none">("company");
  const [cumulative, setCumulative] = useState(true);
  let [stack, setStack] = useState(true);

  if (cumulative) stack = true;

  const grouped = groupDate(data, group, measure, cumulative);

  return (
    <Card>
      <CardHeader
        title={measure === "Count" ? "Games Played" : "Hours Played"}
        action={
          <FormGroup>
            <SelectBox options={Object.keys(options) as (VideoGameStringKeys | "none")[]} value={group} setValue={setGroup} />
            <FormControlLabel
              label="Cumulative"
              control={<Switch checked={cumulative} onChange={(_, checked) => setCumulative(checked)} />}
            />
            <FormControlLabel
              label="Stack"
              control={<Switch checked={stack} onChange={(_, checked) => setStack(checked)} />}
            />
          </FormGroup>}
      />
      <CardContent>
        <Plot
          style={{ width: "100%", height: "95vh" }}
          data={Object.entries(grouped).map(([group, val]) => ({
            type:  cumulative || !stack ? "scatter" : "bar",
            name: group,
            x: Object.keys(val),
            y: Object.values(val),
            stackgroup: stack ? "*" : undefined,
          }))}
          config={{ displayModeBar: false, responsive: true }}
          layout={{
            showlegend: options[group],
            legend: { x: 0, y: 1, orientation: "h" },
            barmode: stack ? "stack" : undefined,
            margin: { l: 40, r: 0, t: 0, b: 40 },
            xaxis: { tickmode: "array" },
          }}
        />
      </CardContent>
    </Card>
  );
};

const groupDate = (data: VideoGame[], group: VideoGameStringKeys | "none", measure: Measure, cumulative: boolean) => {
  const grouped = data.reduce((tree, game) => {
    const groupVal = group === "none" ? "" : game[group];
    let year = cumulative ? game.startDate?.toISOString().substring(0, 7) : game.startDate?.getFullYear().toString();
    if (!year || !game.hours) return tree;

    tree[groupVal] = tree[groupVal] || {};
    tree[groupVal][year] = (tree[groupVal][year] || 0) + (measure === "Count" ? 1 : game.hours);
    return tree;
  }, {} as Record<string, Record<string, number>>);

  if (cumulative) {
    Object.values(grouped).forEach(group => {
      let lastAmount = 0
      const minYearMonth = Object.keys(group).sort()[0]
      const [minYear, minMonth] = minYearMonth.split("-").map(s => parseInt(s))
      for (let i = minYear; i <= CURRENT_YEAR; i++) {
        for (let j = (i === minYear ? minMonth : 1); j <= (i === CURRENT_YEAR ? CURRENT_MONTH + 1: 12); j++) {
          const yearMonth = i + '-' + (j < 10 ? "0" : "") + j;
          lastAmount = group[yearMonth] = lastAmount + (group[yearMonth] || 0)
        }
      }
    })
  }

  return grouped;
};

export default Barchart;
