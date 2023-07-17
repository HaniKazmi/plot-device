import { Card, CardContent, CardHeader, FormControlLabel, FormGroup, Switch, useTheme } from "@mui/material";
import { useCallback, useState } from "react";
import Chart from "react-google-charts";
import { VideoGame } from "./types";
import { CURRENT_DATE } from "../utils/dateUtils";

const Timeline = ({ data }: { data: VideoGame[] }) => {
  const theme = useTheme();
  const [groupData, setGroupData] = useState(false);
  const [height, setHeight] = useState<string | number>("50vh");

  const groupFunc = groupData ? ({ company }: VideoGame) => company : () => "*";

  const timelineHeader: any[] = [
    [
      { type: "string", id: "Group" },
      { type: "string", id: "Game" },
      { type: "string", role: "tooltip" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" },
    ],
  ];

  const gameData = data
    .filter(({ exactDate, startDate }) => exactDate && startDate.getFullYear() > 2014)
    .map((row) => [groupFunc(row), row.name, tooltip(row), row.startDate, row.endDate || CURRENT_DATE]);

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
        setHeight(newHeight < document.documentElement.clientHeight * 0.95 ? newHeight : height);
      }
    }
  }, [theme.palette.text.secondary, height]);

  return (
    <Card>
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Group Data"
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
            data={timelineHeader.concat(gameData)}
            onLoad={() => {
              setTimeout(callback, 100);
            }}
            chartEvents={[{ eventName: "ready", callback: callback }]}
            options={{
              backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey.A700 : undefined,
              timeline: { rowLabelStyle: { color: theme.palette.text.primary } },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const tooltip = (row: VideoGame) =>
  `
    <div style="display: inline-block">
        <ul style="list-style-type: none;padding: 5px">
            <li>
                <span><b>${row.name}</b></span>
            </li>
        </ul>
        <hr />
        <ul style="list-style-type: none;padding-left: 10px">
            <li>
                <span><b>Hours: </b></span>
                <span">${row.hours}</span>
            </li>
            <li>
                <span><b>Period: </b></span>
                <span>${row.startDate?.toLocaleDateString()} - ${row.endDate?.toLocaleDateString()} </span>
            </li>
            <li>
                <span><b>Days: </b></span>
                <span>${row.numDays || "-"}</span>
            </li>
        </ul>
    </div>
    `;

export default Timeline;
