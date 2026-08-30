/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs.
 *
 * They live apart from both the components that carry them and the one that builds the rail,
 * because those are the two halves that have to agree: `Stats` owns the bands above the charts,
 * `Graphs` everything below, and an id written out twice is an id that can be changed once.
 *
 * There is no `now` anchor: a film is watched, not in progress, so this page has nothing in
 * flight to lead with — the closest thing is the Recently Watched card in Explore.
 */
export const MOVIE_SECTIONS = {
  vitals: "movie-vitals",
  top: "movie-top",
  explore: "movie-explore",
  timeline: "movie-timeline",
  charts: "movie-charts",
  library: "movie-library",
} as const;

export const movieSections = () => [
  { id: MOVIE_SECTIONS.vitals, label: "Vitals" },
  { id: MOVIE_SECTIONS.top, label: "Top" },
  { id: MOVIE_SECTIONS.explore, label: "Explore" },
  { id: MOVIE_SECTIONS.timeline, label: "Timeline" },
  { id: MOVIE_SECTIONS.charts, label: "Charts" },
  { id: MOVIE_SECTIONS.library, label: "Library" },
];
