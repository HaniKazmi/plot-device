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
 * The rail's chips for this page.
 *
 * The hero is only rendered when a game is in progress, so whether it is there is passed in
 * rather than derived a second time — a chip whose anchor is not on the page scrolls nowhere and
 * looks broken, and one test answered once cannot come apart from itself.
 */
export const vgSections = (hasNow: boolean) => [
  ...(hasNow ? [{ id: VG_SECTIONS.now, label: "Now" }] : []),
  { id: VG_SECTIONS.vitals, label: "Vitals" },
  { id: VG_SECTIONS.top, label: "Top" },
  { id: VG_SECTIONS.explore, label: "Explore" },
  { id: VG_SECTIONS.timeline, label: "Timeline" },
  { id: VG_SECTIONS.charts, label: "Charts" },
  { id: VG_SECTIONS.library, label: "Library" },
];
