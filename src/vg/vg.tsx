import { Suspense, lazy, useEffect, useState, useTransition } from "react";

import { Company, Format, Measure, Platform, Status, VideoGame } from "./types";
import { dateDiffInDays } from "../utils/dateUtils";
import { fetchAndConvertSheet } from "../Google";
import { Tab } from "../tabs";
import { Predicate } from "../utils/types";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));
const Filter = lazy(() => import(/* webpackPrefetch: true */ "./Filter"));

let DATA: VideoGame[];

const GamesGraphs = () => {
  const [data, setData] = useState<VideoGame[]>();
  const [filterFunc, setFilterFunc] = useState<Predicate<VideoGame>>(() => () => true);
  const [measure, setMeasure] = useState<Measure>("Count");
  const [, startTransition] = useTransition()

  useEffect(() => startTransition(() => getData(setData)), []);

  if (!data) {
    return null;
  }

  const vgData = data.filter(filterFunc);
  return (
    <Suspense>
      <Graphs vgData={vgData} measure={measure} />
      <Filter setFilterFunc={setFilterFunc} measure={measure} setMeasure={setMeasure} />
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
    const startDate = row["Start Date"] ? new Date(row["Start Date"]) : undefined;
    const endDate = row["End Date"] ? new Date(row["End Date"]) : undefined;
    if (endDate && row["End Date"].length < 5) endDate.setFullYear(endDate.getFullYear() + 1);
    return {
      name: row["Game"],
      platform: row["Platform"] as Platform,
      company: row["Platform"].split(" ")[0]! as Company,
      franchise: row["Franchise"],
      genre: row["Genre"],
      theme: row["Theme"].split("\n"),
      format: row["Format"] as Format,
      publisher: row["Publisher"],
      rating: row["Rating"],
      status: row["Status"] as Status,
      exactDate: !!row["Start Date"] && row["Start Date"].length > 5,
      startDate: startDate,
      endDate: endDate,
      releaseDate: new Date(row["Release"]),
      hours: row["Hours"] ? parseInt(row["Hours"]) : undefined,
      numDays: dateDiffInDays(startDate, endDate),
      banner: row["Banner"],
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
