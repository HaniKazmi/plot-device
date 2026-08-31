/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs.
 *
 * They live apart from both the components that carry them and the one that builds the rail,
 * because those are the two halves that have to agree: `Stats` owns the bands above the charts,
 * `Graphs` everything below, and an id written out twice is an id that can be changed once.
 *
 * There is no `now` anchor: a film is watched, not in progress. What the page leads with
 * instead is `latest` — the film watched most recently, which every film's watch date defines.
 */
export const MOVIE_SECTIONS = {
  latest: "movie-latest",
  vitals: "movie-vitals",
  top: "movie-top",
  explore: "movie-explore",
  timeline: "movie-timeline",
  charts: "movie-charts",
  library: "movie-library",
} as const;

/**
 * "Latest" is only offered when the page holds any films at all, so the chip never points at an
 * anchor that is not rendered — the same rule the other tabs' "Now" chips follow.
 */
export const movieSections = (hasLatest: boolean) => [
  ...(hasLatest ? [{ id: MOVIE_SECTIONS.latest, label: "Latest" }] : []),
  { id: MOVIE_SECTIONS.vitals, label: "Vitals" },
  { id: MOVIE_SECTIONS.top, label: "Top" },
  { id: MOVIE_SECTIONS.explore, label: "Explore" },
  { id: MOVIE_SECTIONS.timeline, label: "Timeline" },
  { id: MOVIE_SECTIONS.charts, label: "Charts" },
  { id: MOVIE_SECTIONS.library, label: "Library" },
];
