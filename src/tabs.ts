import type { FunctionComponent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Shows from "./show/Show";
import VideoGames from "./vg/vg";
import Movies from "./movie/Movie";
import Omnibus from "./omnibus/Omnibus";

export interface Tab {
  id: string;
  name: string;
  /**
   * The sheet this tab is the dashboard for, absent on a tab that has none of its own. Omnibus
   * composes the three sheets the other tabs already fetch, so a sheet id here would name one of
   * them arbitrarily — and the "Sheet" button in the app bar would send a reader to a third of
   * what they are looking at.
   */
  spreadsheetId?: string;
  /**
   * Deliberately wider than the columns in use. `arrayToJson` keys each row by its header name, so
   * a range only has to *cover* a column for the converter to find it — but a column added or
   * moved past the end of a tight range simply stops arriving, with no error anywhere. That has
   * silently dropped a field twice. Trailing empty columns cost one extra key and nothing else.
   */
  range?: string;
  component: FunctionComponent;
  primaryColour?: string;
  secondaryColour?: string;
}

/**
 * A tab that names a sheet, which is what `useData` and `fetchAndConvertSheet` require. Keeping
 * the requirement in the type rather than in an assertion is what lets a sheetless tab exist at
 * all without either faking an id or leaving every fetch to check for one.
 */
export type SheetTab = Tab & Required<Pick<Tab, "spreadsheetId" | "range">>;

export const VideoGamesTab: SheetTab = {
  id: "vg",
  name: "Games",
  spreadsheetId: "1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk",
  range: "Games List!A:Z",
  component: VideoGames,
  primaryColour: "#d019ca",
  secondaryColour: "#00bb7e",
};

export const ShowsTab: SheetTab = {
  id: "show",
  name: "Shows",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Shows!A:Z",
  component: Shows,
  primaryColour: "#127d9c",
  secondaryColour: "#ff77a0",
};

export const MoviesTab: SheetTab = {
  id: "movies",
  name: "Movies",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Movies!A:Z",
  component: Movies,
  primaryColour: "#de4412",
  secondaryColour: "#4099ff",
};

/**
 * The tab reads no sheet of its own: it mounts the three domains' own data configurations and
 * composes their output, so a medium's rows reach it through exactly the converter and cache its
 * home tab uses.
 *
 * Its indigo is one of five hues taken from the arcs the status ramp leaves free, so no tab's app
 * bar lands on a vocabulary its own page draws — `Barchart` paints a single-group series in
 * `palette.primary.main`, which makes a theme chart geometry and not only chrome. The medium trio
 * in `omnibus/types.ts` is chosen from the same five hues, by hand — nothing derives one from the
 * other, so moving a tab's primary means moving its medium fill in the same edit.
 *
 * A secondary is **not** its primary's complement. The five primaries are spread around the wheel,
 * so 180° from any one of them lands on another: complements put the Movies accent 3.2 dE from the
 * Shows app bar and the Omnibus accent 3.4 from Books'. Each secondary instead takes the midpoint
 * of a gap *between* two primaries, so the ten interleave — no accent reads as another tab's bar,
 * and the closest of all ten pairs is 16.1 dE. Each still lands over 31 dE from its own primary,
 * which is what `NavBar`'s indicator needs: it is drawn on that primary.
 */
export const OmnibusTab: Tab = {
  id: "omnibus",
  name: "Omnibus",
  component: Omnibus,
  primaryColour: "#6217f6",
  secondaryColour: "#ee9300",
};

/**
 * Omnibus leads the array, which is what puts it at the root route: `App.tsx` renders
 * `Tabs[0].component` for the index route, and `tabForPath` falls back to `tabs[0]` for any path
 * that matches no tab id, root included.
 */
const Tabs: Tab[] = [OmnibusTab, VideoGamesTab, ShowsTab, MoviesTab];

/**
 * The tab a route belongs to, falling back to the first one.
 *
 * The match is an exact, case-sensitive comparison against the tab id after a single leading
 * slash is stripped, so a trailing slash or any nested path falls back rather than matching.
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
