import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { fetchAndConvertSheet, useApiReady } from "../utils/googleUtils.ts";
import { useFilterReducer } from "./filterUtils.ts";
import { PlainDate } from "../common/date.ts";
import type { Company, Format, Platform, Status, VideoGame } from "./types";
import type { Tab } from "../tabs";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const storage = localStorage;
const storageKey = "vg-data-cache";

let DATA: VideoGame[];

const GamesGraphs = () => {
  const [data, dataLoaded] = useData();
  const [filterState, filterDispatch] = useFilterReducer();
  const vgData = useMemo(() => (data ? data.filter(filterState.filter) : []), [data, filterState.filter]);

  if (!data) {
    return null;
  }

  return (
    <Suspense>
      <Graphs
        data={data}
        dataLoaded={dataLoaded}
        vgData={vgData}
        filterState={filterState}
        filterDispatch={filterDispatch}
      />
    </Suspense>
  );
};

const useData = (): [VideoGame[] | undefined, boolean] => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [data, setData] = useState<VideoGame[] | undefined>(() => {
    if (DATA) return DATA;
    const tempData = storage.getItem(storageKey);
    if (tempData) {
      return JSON.parse(tempData, (key, value) => {
        if (key.includes("Date")) {
          return PlainDate.from(value as string);
        }
        return value as unknown;
      }) as VideoGame[];
    }

    return undefined;
  });

  const { apiReady } = useApiReady();
  useEffect(() => {
    if (!apiReady) return;
    fetchAndConvertSheet(VideoGameTab, jsonConverter, (data) => {
      DATA = data;
      setData(data);
      setDataLoaded(true);
      storage.setItem(storageKey, JSON.stringify(data));
    });
  }, [apiReady]);

  return [data, dataLoaded];
};

const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row) => {
    const startDate = PlainDate.from(row["Start Date"]);
    const endDate = row["End Date"] ? PlainDate.from(row["End Date"]) : undefined;

    const party = row.Status === "Party";
    const status = party ? "Endless" : (row.Status as Status);

    return {
      name: row.Game,
      platform: row.Platform as Platform,
      company: row.Platform.split(" ")[0] as Company,
      franchise: row.Franchise,
      genre: row.Genre,
      theme: row.Theme.split("\n"),
      format: row.Format as Format,
      developer: row.Developer,
      publisher: row.Publisher,
      rating: row.Rating,
      status: status,
      party: party,
      startDate: startDate,
      endDate: endDate,
      releaseDate: PlainDate.from(row.Release),
      hours: row.Hours ? parseInt(row.Hours) : undefined,
      numDays: startDate.daysTo(endDate),
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
