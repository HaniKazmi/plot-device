import { Card, CardContent, CardHeader, FormControlLabel, FormGroup, Switch } from "@mui/material";
import { useState } from "react";
import Chart from "react-google-charts";
import { VideoGame } from "./types";
import { CURRENT_DATE } from "../utils/dateUtils";

const Timeline = ({ data }: { data: VideoGame[] }) => {
  const [groupData, setGroupData] = useState(false);
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
    .map((row) => [groupFunc(row), row.name, tooltip(row), row.startDate, row.endDate || CURRENT_DATE ]);

  let chartHeight: string;

  if (groupData) chartHeight = "55vh";
  else chartHeight = "30vh";

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
            key={chartHeight}
            width="400vw"
            height={chartHeight}
            chartType="Timeline"
            data={timelineHeader.concat(gameData)}
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
