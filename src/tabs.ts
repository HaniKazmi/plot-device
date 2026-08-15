import type { FunctionComponent } from "react";
import { useLocation } from "react-router-dom";
import Holiday from "./holiday/Holiday";
import Shows from "./show/Show";
import VideoGames from "./vg/vg";
import Movies from "./movie/Movie";

export interface Tab {
  id: string;
  name: string;
  spreadsheetId: string;
  range: string;
  component: FunctionComponent;
  primaryColour?: string;
  secondaryColour?: string;
}

export const VideoGamesTab: Tab = {
  id: "vg",
  name: "Games",
  spreadsheetId: "1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk",
  range: "Games List!A:Z",
  component: VideoGames,
};

export const ShowsTab: Tab = {
  id: "show",
  name: "Shows",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Sheet1!A:N",
  component: Shows,
  primaryColour: "#df2020",
  secondaryColour: "#20dfdf",
};

export const MoviesTab: Tab = {
  id: "movies",
  name: "Movies",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Movies!A:K",
  component: Movies,
  primaryColour: "#ff7b54",
  secondaryColour: "#11698e",
};

export const HolidaysTab: Tab = {
  id: "holiday",
  name: "Holiday",
  spreadsheetId: "1tjcFfNZau5DElrTos2RFjpvYWJJleTQIg8kWxdjdgnc",
  range: "Locations!A:Z",
  component: Holiday,
  primaryColour: "#277114",
  secondaryColour: "#142771",
};

const Tabs: Tab[] = [VideoGamesTab, ShowsTab, MoviesTab];

export const useCurrentTab = (): Tab => {
  const { pathname } = useLocation();
  return Tabs.find((tab) => tab.id === pathname.replace(/^\//, "")) ?? Tabs[0];
};

export default Tabs;
