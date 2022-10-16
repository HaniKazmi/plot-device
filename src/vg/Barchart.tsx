import { Card, CardContent, CardHeader, FormControlLabel, FormGroup, Switch } from "@mui/material";
import { useState } from "react";
import Plot from "../plotly"
import { SelectBox } from "./SelectionComponents";
import { Measure, VideoGame, VideoGameStringKeys } from "./types";

const options: Record<VideoGameStringKeys | "none", boolean> = {
  none: true,
  company: true,
  format: true,
  franchise: false,
  game: false,
  platform: true,
  publisher: false,
  rating: true,
  status: true,
};

const Barchart = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [group, setGroup] = useState<VideoGameStringKeys | "none">("company");
  const [cumulative, setCumulative] = useState(false);

  const grouped = data.reduce((tree, game) => {
    const groupVal = group === "none" ? "" : game[group];
    const year = game.startDate?.getFullYear().toString();
    if (!year || !game.hours) return tree;

    tree[groupVal] = tree[groupVal] || {};
    tree[groupVal][year] = (tree[groupVal][year] || 0) + (measure === "Count" ? 1 : game.hours);
    return tree;
  }, {} as Record<string, Record<string, number>>);

  if (cumulative) {
    Object.values(grouped).forEach(group => {
      let lastAmount = 0
      const min = parseInt(Object.keys(group).sort()[0])
      const end = new Date().getFullYear()
      for (let i = min; i <= end; i++) {
        lastAmount = group[i] = lastAmount + (group[i] || 0)
      }
    })
  }

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
          </FormGroup>}
      />
      <CardContent>
        <Plot
          style={{ width: "100%", height: "95vh" }}
          data={Object.entries(grouped).map(([group, val]) => ({
            type: cumulative ? "scatter" : "bar",
            name: group,
            x: Object.keys(val),
            y: Object.values(val),
            stackgroup: "*",
          }))}
          config={{ displayModeBar: false, responsive: true }}
          layout={{
            showlegend: options[group],
            legend: { x: 0, y: 1, orientation: "h" },
            barmode: "stack",
            margin: { l: 40, r: 0, t: 0, b: 40 },
            xaxis: { tickmode: "linear" },
          }}
        />
      </CardContent>
    </Card>
  );
};

export default Barchart;
