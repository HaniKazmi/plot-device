import { currentlyWatching } from "./statsData";
import type { Show } from "./types";

/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs.
 *
 * They live apart from both the components that carry them and the one that builds the rail,
 * because those are the two halves that have to agree: `Stats` owns the bands above the charts,
 * `Graphs` owns everything below, and an id written out twice is an id that can be changed once.
 */
export const SHOW_SECTIONS = {
  now: "show-now",
  vitals: "show-vitals",
  explore: "show-explore",
  timeline: "show-timeline",
  charts: "show-charts",
  library: "show-library",
} as const;

/**
 * The rail's chips for this data.
 *
 * "Now" is conditional on there being a season in progress, and this makes the same test `Stats`
 * makes — a chip whose anchor is not on the page scrolls nowhere and looks broken.
 */
export const showSections = (data: Show[]) => [
  ...(currentlyWatching(data).length > 0 ? [{ id: SHOW_SECTIONS.now, label: "Now" }] : []),
  { id: SHOW_SECTIONS.vitals, label: "Vitals" },
  { id: SHOW_SECTIONS.explore, label: "Explore" },
  { id: SHOW_SECTIONS.timeline, label: "Timeline" },
  { id: SHOW_SECTIONS.charts, label: "Charts" },
  { id: SHOW_SECTIONS.library, label: "Library" },
];
