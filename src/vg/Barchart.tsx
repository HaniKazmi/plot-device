import { Card, CardHeader, CardContent } from "@mui/material";
import { useState } from "react";
import Plot from "react-plotly.js";
import { SelectBox } from "./SelectionComponents";
import { Measure, VideoGame, VideoGameStringKeys } from "./Types";

const options: (VideoGameStringKeys | "none")[] = [
  "none",
  "company",
  "format",
  "franchise",
  "game",
  "platform",
  "publisher",
  "rating",
  "status"
];

const Barchart = ({ data, measure }: { data: VideoGame[], measure: Measure }) => {
  const [group, setGroup] = useState<VideoGameStringKeys | "none">("company")

  const grouped = data
    .reduce((tree, game) => {
      const groupVal = group === "none" ? "" : game[group]
      const year = game.startDate?.getFullYear().toString()
      if (!year || !game.hours) return tree;

      tree[groupVal] = tree[groupVal] || {}
      tree[groupVal][year] = (tree[groupVal][year] || 0) + (measure === "Count" ? 1 : parseInt(game.hours));
      return tree;
    }, {} as Record<string, Record<string, number>>);

  return (
    <Card>
      <CardHeader title={measure === "Count" ? "Games Played" : "Hours Played"} action={
        <SelectBox options={options} value={group} setValue={setGroup} />
      } />
      <CardContent>
        <Plot
          style={{ width: "100%", height: "95vh" }}
          data={Object.entries(grouped).map(([group, val]) => (
            {
              type: "bar",
              name: group,
              x: Object.keys(val),
              y: Object.values(val)
            }
          ))}
          config={{ displayModeBar: false, responsive: true }}
          layout={{ legend: {x: 0, y: 1, orientation: "h" },  barmode: 'stack', margin: { l: 40, r: 0, t: 0, b: 40 }, xaxis: { tickmode: "linear" } }}
        />
      </CardContent>
    </Card>
  );
};

export default Barchart