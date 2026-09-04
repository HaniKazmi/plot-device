import { chartsLastOrder, tabSections } from "../common/sections";

const { ids, keys, chips } = tabSections("show", [
  { key: "now", label: "Now" },
  { key: "vitals", label: "Vitals" },
  { key: "top", label: "Top" },
  { key: "explore", label: "Explore" },
  { key: "timeline", label: "Timeline" },
  { key: "charts", label: "Charts" },
  { key: "library", label: "Library" },
]);

/** The anchors the page's sticky rail scrolls to, in the order the page runs. */
export const SHOW_SECTIONS = ids;

/**
 * The rail's chips for this page.
 *
 * "Now" is only rendered when a season is in progress, so whether it is there is passed in rather
 * than derived a second time — one test answered once cannot come apart from itself.
 *
 * `chartsLast` is the phone's reading order, `chartsLastOrder` and the page's own
 * `ChartsAndLibrary` being the two halves of it: the rail reads the current section as the first of
 * *its* order still in view, so the list and the DOM have to say the same thing.
 */
export const showSections = (hasNow: boolean, chartsLast: boolean) =>
  chips({ now: hasNow }, chartsLastOrder(keys, chartsLast));
