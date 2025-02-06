import { lazy, Suspense, useMemo } from "react";
import { Season, Show, Status } from "./types";
import { ShowsTab } from "../tabs";
import { PlainDate, YearMonthDay } from "../common/date.ts";
import useData from "../common/useData.ts";
import { useFilterReducer } from "./filterUtils.ts";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

const storageKey = "show-data-cache";

let DATA_STORE: Show[];
const setDataStore = (data: Show[]) => (DATA_STORE = data);
const useDataStore = () => [DATA_STORE, setDataStore] as const;

const ShowsGraph = () => {
  const [data, ] = useData(storageKey, ShowsTab, jsonConverter, useDataStore, (items) =>
    items.forEach((show) => show.s.forEach((s) => (s.show = show))),
  );

  const [filterState, filterDispatch] = useFilterReducer();
  const showData = useMemo(() => (data ? data.filter(filterState.filter) : []), [data, filterState.filter]);

  if (!data) {
    return null;
  }

  return (
    <Suspense>
      <Graphs data={showData} filterState={filterState} filterDispatch={filterDispatch} />
    </Suspense>
  );
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
        startDate: PlainDate.from(row.Start) as YearMonthDay,
        endDate: row.End ? (PlainDate.from(row.End) as YearMonthDay) : undefined,
        episodeLength: row.Episodes ? parseInt(row.Episodes) : undefined,
        show: show as Show,
      };

      season.minutes = season.episodeLength ? season.episodeLength * season.e! : 0;
      if (season.startDate && season.startDate.year > 2005) {
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

export default ShowsGraph;
