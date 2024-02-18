import { Suspense, lazy, useEffect, useState, useTransition } from "react";
import { Company, Format, Platform, Status, VideoGame } from "./types";
import { dateDiffInDays } from "../utils/dateUtils";
import { Tab } from "../tabs";
import { fetchAndConvertSheet } from "../utils/googleUtils.ts";
import { useFilterReducer } from "./filterUtils.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));
const Filter = lazy(() => import(/* webpackPrefetch: true */ "./Filter"));

let DATA: VideoGame[];

const GamesGraphs = () => {
  const [data, setData] = useState<VideoGame[]>();
  const [filterState, filterDispatch] = useFilterReducer();
  const [, startTransition] = useTransition();

  useEffect(() => startTransition(() => getData(setData)), []);

  if (!data) {
    return null;
  }

  const vgData = data.filter(filterState.filter);
  return (
    <Suspense>
      <Graphs vgData={vgData} filterState={filterState} filterDispatch={filterDispatch} />
      <Filter state={filterState} dispatch={filterDispatch} data={data} />
    </Suspense>
  );
};

const getData = (setData: (b: VideoGame[]) => void) => {
  if (DATA) {
    setData(DATA);
    return;
  }

  fetchAndConvertSheet(VideoGameTab, jsonConverter, (data) => {
    DATA = data;
    setData(data);
  });
};

const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row) => {
    if (!row["Start Date"]) throw new Error("Invalid Date: " + row.game);
    const startDate = new Date(row["Start Date"]);
    const endDate = row["End Date"] ? new Date(row["End Date"]) : undefined;
    const exactDate = row["Start Date"] && row["Start Date"]?.length > 5;
    if (endDate && row["End Date"].length < 5) {
      endDate.setMonth(11);
      endDate.setDate(31);
    }

    return {
      name: row.Game,
      platform: row.Platform as Platform,
      company: row.Platform.split(" ")[0]! as Company,
      franchise: row.Franchise,
      genre: row.Genre,
      theme: row.Theme.split("\n"),
      format: row.Format as Format,
      developer: row.Developer,
      publisher: row.Publisher,
      rating: row.Rating,
      status: row.Status as Status,
      exactDate: exactDate,
      startDate: startDate,
      endDate: endDate,
      releaseDate: new Date(row.Release),
      hours: row.Hours ? parseInt(row.Hours) : undefined,
      numDays: exactDate ? dateDiffInDays(startDate, endDate) : undefined,
      banner: row.Banner,
    } as VideoGame;
  });
};

const VideoGameTab: Tab = {
  id: "vg",
  name: "Games",
  spreadsheetId: "1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk",
  range: "Games List!A:Z",
  component: <GamesGraphs />,
};

export default VideoGameTab;
