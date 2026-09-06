import { tabSections } from "../common/sections";

const { ids, chips } = tabSections("show", [
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
 */
export const showSections = (hasNow: boolean) => chips({ now: hasNow });
