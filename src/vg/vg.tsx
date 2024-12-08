import { lazy, Suspense, useMemo } from "react";
import { useFilterReducer } from "./filterUtils.ts";
import { PlainDate } from "../common/date.ts";
import type { Company, Format, Platform, Status, VideoGame } from "./types";
import type { Tab } from "../tabs";
import useData from "../common/useData.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const storageKey = "vg-data-cache";

let DATA_STORE: VideoGame[];
const setDataStore = (data: VideoGame[]) => (DATA_STORE = data);
const useDataStore = () => [DATA_STORE, setDataStore] as const;

const GamesGraphs = () => {
  const [data, dataLoaded] = useData(storageKey, VideoGameTab, jsonConverter, useDataStore);
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
