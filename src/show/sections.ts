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
 * The rail's chips for this page.
 *
 * "Now" is only rendered when a season is in progress, so whether it is there is passed in rather
 * than derived a second time — a chip whose anchor is not on the page scrolls nowhere and looks
 * broken, and one test answered once cannot come apart from itself.
 */
export const showSections = (hasNow: boolean) => [
  ...(hasNow ? [{ id: SHOW_SECTIONS.now, label: "Now" }] : []),
  { id: SHOW_SECTIONS.vitals, label: "Vitals" },
  { id: SHOW_SECTIONS.explore, label: "Explore" },
  { id: SHOW_SECTIONS.timeline, label: "Timeline" },
  { id: SHOW_SECTIONS.charts, label: "Charts" },
  { id: SHOW_SECTIONS.library, label: "Library" },
];
