import { trackedTabSections } from "../common/sections";

const { ids, chips } = trackedTabSections("movies", "latest");

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
 */
export const movieSections = (hasLatest: boolean) => chips({ latest: hasLatest });
