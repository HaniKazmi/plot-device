import { movedAfter, tabSections } from "../common/sections";

const { ids, keys, chips } = tabSections("movie", [
  { key: "latest", label: "Now" },
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
 * The key is `latest`, not `now`: a film is watched, not in progress, so what the anchor names is
 * the film watched most recently. The chip reads "Now" regardless, matching the other three tabs'
 * rail — the hero's own kicker underneath it already says "Latest watch".
 */
export const MOVIE_SECTIONS = ids;

/**
 * "Now" is only offered when the page holds any films at all, so the chip never points at an
 * anchor that is not rendered — the same rule the other tabs' "Now" chips follow.
 *
 * `chartsLast` is the phone's reading order: the library before the charts. The page renders the
 * two sections in that order too, and this list has to say the same thing — the rail reads the
 * current section as the first of *its* order still in view.
 */
export const movieSections = (hasLatest: boolean, chartsLast: boolean) =>
  chips({ latest: hasLatest }, chartsLast ? movedAfter(keys, "charts", "library") : keys);
