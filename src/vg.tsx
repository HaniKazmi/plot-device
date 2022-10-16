import { ThemeProvider } from "@emotion/react";
import { createTheme, Stack } from "@mui/material";
import { useEffect, useState } from "react";

import Barchart from "./vg/Barchart";
import Timeline from "./vg/Timeline";
import Filter from "./vg/Filter";
import Stats from "./vg/Stats";
import Sunburst from "./vg/Sunburst";
import { Company, Format, Measure, Platform, Predicate, Status, VideoGame } from "./vg/types";

const GamesGraphs = ({ hide } : { hide: boolean}) => {
  const [data, setData] = useState<Record<string, string>[]>();
  const [filterFunc, setFilterFunc] = useState<Predicate<VideoGame>>(() => () => true);
  const [measure, setMeasure] = useState<Measure>("Count");

  useEffect(() => getVgData(setData), []);

  if (!data || hide) {
    console.log("no data");
    return null;
  }

  const vgData: VideoGame[] = data
    .map((row) => {
      const startDate = row["Start Date"] ? new Date(row["Start Date"]) : undefined;
      let endDate = row["End Date"] ? new Date(row["End Date"]) : undefined;
      if (endDate && row["End Date"].length < 5) endDate.setFullYear(endDate.getFullYear() + 1);
      endDate = startDate && (endDate || new Date())
      return {
        game: row["Game"],
        platform: row["Platform"] as Platform,
        company: row["Platform"].split(" ")[0]! as Company,
        franchise: row["Franchise"],
        genre: row["Genre"].split("\n"),
        theme: row["Theme"].split("\n"),
        format: row["Format"] as Format,
        publisher: row["Publisher"],
        rating: row["Rating"],
        status: row["Status"] as Status,
        exactDate: !!row["Start Date"] && row["Start Date"].length > 5,
        startDate: startDate,
        endDate: endDate,
        hours: row["Hours"] ? parseInt(row["Hours"]) : undefined,
        numDays: dateDiffInDays(startDate, endDate),
      } as VideoGame;
    })
    .filter(filterFunc);

  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2}>
        <Stats data={vgData} />
        <Timeline data={vgData} />
        <Sunburst data={vgData} measure={measure} />
        <Barchart data={vgData} measure={measure} />
        <Filter setFilterFunc={setFilterFunc} measure={measure} setMeasure={setMeasure} />
      </Stack>
    </ThemeProvider>
  );
};

const theme = createTheme({
  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&:hover": {
            boxShadow: theme.shadows[4],
          },
        }),
      },
    },
  },
});

const arrayToJson = (data: string[][]) => {
  const [header, ...rows] = data;
  return rows.map((row) =>
    row.reduce((json, val, index) => {
      json[header[index]] = val
      return json
    }, {} as Record<string, string>)
  );
};

const getVgData = (setData: (b: Record<string, string>[]) => void) => {
  gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk",
      range: "Games List!A:Z",
    })
    .then((response) => response.result.values!)
    .then(arrayToJson)
    .then(setData);
};

const dateDiffInDays = (dt1?: Date, dt2?: Date) => {
  if (!dt1 || !dt2) return;
  return Math.floor(
    (dt2.getTime() - dt1.getTime()) /
    (1000 * 60 * 60 * 24) + 1
  );
};

export default GamesGraphs;
