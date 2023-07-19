import { Stack } from "@mui/material";
import { useState, useEffect, lazy, Suspense } from "react";
import { Season, Show, Status } from "./types";
import { fetchAndConvertSheet } from "../Google";
import { Tab } from "../tabs";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

let DATA: Show[];

const ShowsGraph = () => {
  const [data, setData] = useState<Show[]>();

  useEffect(() => getData(setData), []);

  if (!data) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Suspense>
        <Graphs data={data} />
      </Suspense>
    </Stack>
  );
};

const getData = (setData: (b: Show[]) => void) => {
  if (DATA) {
    setData(DATA);
    return;
  }

  fetchAndConvertSheet(ShowTab, jsonConverter, (data) => {
    DATA = data;
    setData(data);
  });
};

const jsonConverter = (json: Record<string, string>[]) => {
  const showData: Show[] = [];
  json.reduce((show, row) => {
    if (row["Show"] !== "") {
      show = {
        name: row["Show"],
        status: row["Status"] as Status,
        anime: row["Anime"] === "TRUE",
        banner: row["Banner"],
        s: [],
      };
      showData.push(show as Show);
    } else {
      const season: Partial<Season> = {
        s: parseFloat(row["Season"]),
        e: parseInt(row["Episode"]),
        startDate: new Date(row["Start"]),
        endDate: row["End"] ? new Date(row["End"]) : undefined,
        episodeLength: row["Episodes"] ? parseInt(row["Episodes"]) : undefined,
      };

      season.minutes = season.episodeLength ? season.episodeLength * season.e! : undefined;
      if (season.startDate && season.startDate.getFullYear() > 2005) {
        show.s!.push(season as Season);
      }
    }

    return show;
  }, {} as Partial<Show>);

  showData.forEach((show) => {
    show.startDate = show.s?.[0].startDate;
    show.endDate = show.s?.at(-1)?.endDate;
    show.e = show.s?.sum("e");
    show.minutes = show.s?.sum("minutes");
  });

  return showData;
};

const ShowTab: Tab = {
  id: "show",
  name: "Shows",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Sheet1!A:J",
  component: <ShowsGraph />,
};

export default ShowTab;
