import { currentlyPlaying } from "./statsData";
import type { VideoGame } from "./types";

/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs.
 *
 * They live apart from both the components that carry them and the one that builds the rail,
 * because those are the two halves that have to agree: `Stats` owns the hero and the bands above
 * the charts, `Graphs` owns everything below, and an id written out twice is an id that can be
 * changed once.
 */
export const VG_SECTIONS = {
  now: "vg-now",
  vitals: "vg-vitals",
  top: "vg-top",
  explore: "vg-explore",
  timeline: "vg-timeline",
  charts: "vg-charts",
  library: "vg-library",
} as const;

/**
 * The rail's chips for this data.
 *
 * The hero is conditional on there being a game in progress, and this makes the same test `Stats`
 * makes — a chip whose anchor is not on the page scrolls nowhere and looks broken.
 */
export const vgSections = (data: VideoGame[]) => [
  ...(currentlyPlaying(data).length > 0 ? [{ id: VG_SECTIONS.now, label: "Now" }] : []),
  { id: VG_SECTIONS.vitals, label: "Vitals" },
  { id: VG_SECTIONS.top, label: "Top" },
  { id: VG_SECTIONS.explore, label: "Explore" },
  { id: VG_SECTIONS.timeline, label: "Timeline" },
  { id: VG_SECTIONS.charts, label: "Charts" },
  { id: VG_SECTIONS.library, label: "Library" },
];
