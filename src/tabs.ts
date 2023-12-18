import Holiday from "./holiday/Holiday";
import Shows from "./show/Show";
import VideoGames from "./vg/vg";

export interface Tab {
  id: string;
  name: string;
  spreadsheetId: string;
  range: string;
  component: JSX.Element;
  primaryColour?: string;
  secondaryColour?: string;
}

const Tabs: Tab[] = [VideoGames, Shows, Holiday];

export default Tabs;
