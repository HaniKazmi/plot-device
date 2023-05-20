import Shows from "./show/Show";
import VideoGames from "./vg/vg";

export interface Tab {
    id: string;
    name: string;
    spreadsheetId: string;
    range: string;
    component: JSX.Element;
}

const Tabs: Tab[] = [
    VideoGames,
    Shows
]

export default Tabs;