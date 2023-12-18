import { useState, useEffect, lazy, Suspense, useTransition } from "react";
import { Season, Show, Status } from "./types";
import { Tab } from "../tabs";
import { fetchAndConvertSheet } from "../utils/googleUtils.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

let DATA: Show[];

const ShowsGraph = () => {
  const [data, setData] = useState<Show[]>();
  const [, startTransition] = useTransition();

  useEffect(() => startTransition(() => getData(setData)), []);

  if (!data) {
    return null;
  }

  return (
    <Suspense>
      <Graphs data={data} />
    </Suspense>
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
    if (row.Show !== "") {
      show = {
        name: row.Show,
        status: row.Status as Status,
        anime: row.Anime === "TRUE",
        banner: row.Banner,
        s: [],
      };
      showData.push(show as Show);
    } else {
      const season: Partial<Season> = {
        s: parseFloat(row.Season),
        e: parseInt(row.Episode),
        subtitle: row.Subtitle,
        startDate: new Date(row.Start),
        endDate: row.End ? new Date(row.End) : undefined,
        episodeLength: row.Episodes ? parseInt(row.Episodes) : undefined,
        show: show as Show,
      };

      season.minutes = season.episodeLength ? season.episodeLength * season.e! : undefined;
      if (season.startDate && season.startDate.getFullYear() > 2005) {
        show.s!.push(season as Season);
      }
      if (season.startDate && season.endDate) {
        console.assert(season.startDate <= season.endDate, "Dates are wrong", season);
      }
    }

    return show;
  }, {} as Partial<Show>);

  showData.forEach((show) => {
    show.startDate = show.s[0].startDate;
    show.endDate = show.s.at(-1)?.endDate;
    show.e = show.s.sum("e");
    show.minutes = show.s.sum("minutes");
    if (show.startDate && show.endDate) {
      console.assert(show.startDate <= show.endDate, "Dates are wrong", show);
    }
  });

  return showData;
};

const ShowTab: Tab = {
  id: "show",
  name: "Shows",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Sheet1!A:K",
  component: <ShowsGraph />,
  primaryColour: "#df2020",
  secondaryColour: "#20dfdf"
};

export default ShowTab;
