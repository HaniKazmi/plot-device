import { Card, CardHeader, FormGroup, FormControlLabel, Switch, CardContent } from "@mui/material";
import { useState } from "react";
import Chart from "react-google-charts";
import { Season, Show } from "./types";
import { CURRENT_DATE } from "../utils/dateUtils";

const Timeline = ({ data }: { data: Show[] }) => {
  const [groupData, setGroupData] = useState(true);

  const timelineHeader: any[] = [
    [
      { type: "string", id: "*" },
      { type: "string", id: "Show" },
      { type: "string", role: "tooltip" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" },
    ],
  ];

  const seasons = data.flatMap(show => show.s.map(s => [`${show.name} - S${s.s}`, s] as [string, Season]))

  const showData = groupData
    ? data.map((show) => ["*", show.name, tooltip(show.name, show), show.startDate, show.endDate || CURRENT_DATE])
    : seasons.map(([title, season]) => ["*", title, tooltip(title, season), season.startDate, season.endDate || CURRENT_DATE]);

  let chartHeight: string;

  if (groupData) chartHeight = "95vh";
  else chartHeight = "70vh";

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
            key={chartHeight}
            width="400vw"
            height={chartHeight}
            chartType="Timeline"
            data={timelineHeader.concat(showData)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const tooltip = (title: string, row: Show | Season) =>
  `
    <div style="display: inline-block">
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