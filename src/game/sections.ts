import { trackedTabSections } from "../common/sections";

const { ids, chips } = trackedTabSections("games");

/** The anchors the page's sticky rail scrolls to, in the order the page runs. */
export const GAME_SECTIONS = ids;

/**
 * The rail's chips for this page.
 *
 * The hero is only rendered when a game is in progress, so whether it is there is passed in rather
 * than derived a second time — one test answered once cannot come apart from itself.
 */
export const gameSections = (hasNow: boolean) => chips({ now: hasNow });
