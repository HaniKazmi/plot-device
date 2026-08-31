import type { FunctionComponent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Holiday from "./holiday/Holiday";
import Shows from "./show/Show";
import VideoGames from "./vg/vg";
import Movies from "./movie/Movie";

export interface Tab {
  id: string;
  name: string;
  spreadsheetId: string;
  /**
   * Deliberately wider than the columns in use. `arrayToJson` keys each row by its header name, so
   * a range only has to *cover* a column for the converter to find it — but a column added or
   * moved past the end of a tight range simply stops arriving, with no error anywhere. That has
   * silently dropped a field twice. Trailing empty columns cost one extra key and nothing else.
   */
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
  primaryColour: "#4759b7",
  secondaryColour: "#e4b750",
};

export const ShowsTab: Tab = {
  id: "show",
  name: "Shows",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Shows!A:Z",
  component: Shows,
  primaryColour: "#9a282f",
  secondaryColour: "#53c1c7",
};

export const MoviesTab: Tab = {
  id: "movies",
  name: "Movies",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Movies!A:Z",
  component: Movies,
  primaryColour: "#c25410",
  secondaryColour: "#ffc48a",
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

/**
 * The tab a route belongs to, falling back to the first one.
 *
 * The match is an exact, case-sensitive comparison against the tab id after a single leading
 * slash is stripped, so a trailing slash or any nested path falls back rather than matching.
 * `HolidaysTab` is deliberately absent from `tabs`, which is what makes its route unreachable.
 */
export const tabForPath = (pathname: string, tabs: readonly Tab[] = Tabs): Tab =>
  tabs.find((tab) => tab.id === pathname.replace(/^\//, "")) ?? tabs[0];

export const useCurrentTab = (): Tab => tabForPath(useLocation().pathname);

/**
 * Every routed tab but the current one, as chips for the section rail — the jumps the rail can
 * offer once the app bar has scrolled away. The current tab is deliberately absent: it is where
 * the reader already is, and the rail offers movement, not orientation.
 */
export const otherTabs = (current: Tab, tabs: readonly Tab[] = Tabs) =>
  tabs.filter((tab) => tab !== current).map((tab) => ({ id: tab.id, label: tab.name }));

/**
 * The rail's tab chips with their navigation attached here, where the id-is-a-route convention
 * already lives — the rail itself never learns what an id means. A jump also starts at the top
 * of the target page: the reader is deep in this one, and a route change alone leaves the
 * scroll offset where it is.
 */
export const useOtherTabs = () => {
  const navigate = useNavigate();
  return otherTabs(useCurrentTab()).map((tab) => ({
    ...tab,
    jump: () => {
      navigate(`/${tab.id}`);
      window.scrollTo({ top: 0 });
    },
  }));
};

export default Tabs;
