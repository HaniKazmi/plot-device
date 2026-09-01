import { tabSections } from "../common/sections";

const { ids, chips } = tabSections("movie", [
  { key: "latest", label: "Latest" },
  { key: "vitals", label: "Vitals" },
  { key: "top", label: "Top" },
  { key: "explore", label: "Explore" },
  { key: "timeline", label: "Timeline" },
  { key: "charts", label: "Charts" },
  { key: "library", label: "Library" },
]);

/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs.
 *
 * There is no `now` anchor: a film is watched, not in progress. What the page leads with instead
 * is `latest` — the film watched most recently, which every film's watch date defines.
 */
export const MOVIE_SECTIONS = ids;

/**
 * "Latest" is only offered when the page holds any films at all, so the chip never points at an
 * anchor that is not rendered — the same rule the other tabs' "Now" chips follow.
 */
export const movieSections = (hasLatest: boolean) => chips({ latest: hasLatest });
