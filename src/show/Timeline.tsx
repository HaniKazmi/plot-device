import { Card, CardHeader, FormGroup, FormControlLabel, Switch, CardContent, useTheme } from "@mui/material";
import { useCallback, useState } from "react";
import Chart from "react-google-charts";
import { Season, Show } from "./types";
import { CURRENT_DATE } from "../utils/dateUtils";

const DEFAULT_HEIGHT = 90;

const Timeline = ({ data }: { data: Show[] }) => {
  const [groupData, setGroupData] = useState(true);
  const [height, setHeight] = useState<string | number>(DEFAULT_HEIGHT + "vh");
  const theme = useTheme();

  const timelineHeader: any[] = [
    [
      { type: "string", id: "*" },
      { type: "string", id: "Show" },
      { type: "string", role: "tooltip" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" },
    ],
  ];

  const seasons = data.flatMap((show) => show.s.map((s) => [`${show.name} - S${s.s}`, s] as [string, Season]));

  const showData = groupData
    ? data.map((show) => [
        "*",
        show.name,
        tooltip(show.name, show, theme.palette.mode === "dark"),
        show.startDate,
        show.endDate || CURRENT_DATE,
      ])
    : seasons.map(([title, season]) => [
        "*",
        title,
        tooltip(title, season, theme.palette.mode === "dark"),
        season.startDate,
        season.endDate || CURRENT_DATE,
      ]);

  const callback = useCallback(() => {
    const labels = document.getElementsByTagName("text");
    for (let label of labels) {
      if (label.getAttribute("text-anchor") === "middle") {
        label.setAttribute("fill", theme.palette.text.secondary);
      }
    }

    const rects = document.getElementsByTagName("rect");
    for (let rect of rects) {
      if (rect.getAttribute("stroke") === "#9a9a9a") {
        const newHeight = rect.height.baseVal.value + 50;
        setHeight(
          newHeight < document.documentElement.clientHeight * (DEFAULT_HEIGHT / 100) ? newHeight : DEFAULT_HEIGHT + "vh"
        );
      }
    }
  }, [theme.palette.text.secondary]);
  return (
    <Card>
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Combine Seasons"
              control={<Switch checked={groupData} onChange={(_, checked) => setGroupData(checked)} />}
            />
          </FormGroup>
        }
      />
      <CardContent>
        <div style={{ overflowX: "auto", overflowY: "hidden" }}>
          <Chart
            key={height}
            width="400vw"
            height={height}
            chartType="Timeline"
            data={timelineHeader.concat(showData)}
            onLoad={() => {
              setTimeout(callback, 100);
            }}
            chartEvents={[{ eventName: "ready", callback: callback }]}
            options={{
              backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey.A700 : undefined,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const tooltip = (title: string, row: Show | Season, darkMode: boolean) =>
  `
    <div style="display: inline-block; ${darkMode ? "background-color: black" : ""}" >
        <ul style="list-style-type: none;padding: 5px">
            <li>
                <span><b>${title}</b></span>
            </li>
        </ul>
        <hr />
        <ul style="list-style-type: none;padding-left: 10px">
            <li>
                <span><b>Hours: </b></span>
                <span">${Math.round(row.minutes / 60)}</span>
            </li>
            <li>
                <span><b>Period: </b></span>
                <span>${row.startDate.toLocaleDateString()} - ${row.endDate?.toLocaleDateString()} </span>
            </li>
            <li>
                <span><b>Episodes: </b></span>
                <span>${row.e}</span>
            </li>
        </ul>
    </div>
    `;

export default Timeline;
