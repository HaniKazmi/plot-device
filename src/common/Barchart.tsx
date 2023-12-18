import { Card, CardContent, useTheme } from "@mui/material";
import Plot from "../plotly";
import { ReactNode } from "react";
import { CURRENT_MONTH, CURRENT_YEAR } from "../utils/dateUtils";

const Barchart = ({
  grouped,
  cumulative,
  stack,
  children,
}: {
  grouped: Grouped;
  cumulative: boolean;
  stack: boolean;
  children?: ReactNode;
}) => {
  const theme = useTheme();
  let data: Grouped;
  if (cumulative) {
    data = convertToCumulative(grouped);
    stack = true;
  } else {
    data = grouped;
  }

  data = Object.fromEntries(Object.entries(data).sort((first, second) => Object.values(second[1].data).sum() - Object.values(first[1].data).sum()))

  return (
    <Card>
      {children}
      <CardContent>
        <Plot
          style={{ width: "100%", height: "95vh" }}
          data={Object.entries(data)
            .map(([group, { color, data: val }]) => ({
              type: cumulative || !stack ? "scatter" : "bar",
              name: group,
              x: Object.keys(val),
              y: Object.values(val),
              stackgroup: stack ? "*" : undefined,
              marker: {
                color: Object.entries(data).length === 1 ? theme.palette.primary.main : color,
              },
            }))}
          config={{ displayModeBar: false, responsive: true }}
          layout={{
            showlegend: Object.keys(grouped).length > 1 && Object.keys(grouped).length < 8,
            legend: { x: 0, y: 1, orientation: "h" },
            barmode: stack ? "stack" : undefined,
            margin: { l: 40, r: 0, t: 0, b: 40 },
            xaxis: { tickmode: "array" },
            paper_bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0)" : undefined,
            plot_bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0)" : undefined,
            font: {
              color: theme.palette.text.primary,
            },
          }}
        />
      </CardContent>
    </Card>
  );
};

const convertToCumulative = (grouped: Grouped) => {
  return Object.entries(grouped).reduce((prev, [key, { color, data: group }]) => {
    prev[key] = { color: color, data: {} };
    let lastAmount = 0;
    const minYearMonth = Object.keys(group).sort()[0];
    const [minYear, minMonth] = minYearMonth.split("-").map((s) => parseInt(s));
    for (let i = minYear; i <= CURRENT_YEAR; i++) {
      for (let j = i === minYear ? minMonth : 1; j <= (i === CURRENT_YEAR ? CURRENT_MONTH + 1 : 12); j++) {
        const yearMonth = i + "-" + (j < 10 ? "0" : "") + j;
        lastAmount = prev[key].data[yearMonth] = lastAmount + (group[yearMonth] || 0);
      }
    }
    return prev;
  }, {} as Grouped);
};

export type Grouped = Record<
  // Group Name
  string,
  {
    color: string;
    // Date - Value pairs
    data: Record<string, number>;
  }
>;

export default Barchart;
