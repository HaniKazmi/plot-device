import { Card, CardContent, CardHeader } from "@mui/material";
import { useState, useEffect } from "react";
import Chart from "react-google-charts";
import { Platform } from "./types";

const ShowsGraph = ({ hide }: { hide: boolean }) => {
  const [data, setData] = useState<Record<string, string>[]>();
  useEffect(() => getShowData(setData), []);

  if (!data || hide) {
    console.log("no data");
    return null;
  }

  const showData = data
    .filter((row) => row["Show"] !== "")
    .map((row) => {
      return {
        show: row["Show"],
        status: row["Status"] as Platform,
        startDate: row["Start"] ? new Date(row["Start"]) : undefined,
        endDate: row["End"] ? new Date(row["End"]) : new Date(),
        length: row["Length"],
      };
    });

  const timelineData: any[] = [
    [
      { type: "string", id: "*" },
      { type: "string", id: "Show" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" },
    ],
  ];

  const gameData = showData
    // .filter(({ startDate }) => startDate?.getFullYear()! > 2014)
    .map((row) => ["*", row.show, row.startDate, row.endDate]);

  return (
    <Card variant="outlined">
      <CardHeader title="TV Shows" />
      <CardContent>
        <div style={{ overflow: "auto", overflowY: "clip" }}>
          <Chart
            style={{ width: "400vw", height: "100vh" }}
            chartType="Timeline"
            data={timelineData.concat(gameData)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const getShowData = (setData: (b: Record<string, string>[]) => void) => {
  gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
      range: "Sheet1!A:H",
    })
    .then((response) => response.result.values!)
    .then(arrayToJson)
    .then(setData);
};

const arrayToJson = (data: string[][]) => {
  const [header, ...rows] = data;
  return rows.map((row) => {
    const json: Record<string, string> = {};
    row.forEach((val, index) => (json[header[index]] = val));
    return json;
  });
};

export default ShowsGraph;
