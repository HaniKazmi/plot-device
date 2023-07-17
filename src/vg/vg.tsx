import { Stack } from "@mui/material";
import { Suspense, lazy, useEffect, useState } from "react";

import { Company, Format, Measure, Platform, Status, VideoGame } from "./types";
import { dateDiffInDays } from "../utils/dateUtils";
import { fetchAndConvertSheet, useSetTab } from "../Google";
import { Tab } from "../tabs";
import Filter from "./Filter";
import { Predicate } from "../utils/types";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

let DATA: VideoGame[];

const GamesGraphs = () => {
  const [data, setData] = useState<VideoGame[]>();
  const [filterFunc, setFilterFunc] = useState<Predicate<VideoGame>>(() => () => true);
  const [measure, setMeasure] = useState<Measure>("Count");
  const setTab = useSetTab();

  useEffect(() => setTab(VideoGameTab), [setTab]);
  useEffect(() => getData(setData), []);

  if (!data) {
    return null;
  }

  const vgData = data.filter(filterFunc);
  return (
    <Stack spacing={2}>
      <Suspense>
        <Graphs vgData={vgData} measure={measure} />
      </Suspense>
      <Filter setFilterFunc={setFilterFunc} measure={measure} setMeasure={setMeasure} />
    </Stack>
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
