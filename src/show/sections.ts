import { trackedTabSections } from "../common/sections";

const { ids, chips } = trackedTabSections("shows");

/** The anchors the page's sticky rail scrolls to, in the order the page runs. */
export const SHOW_SECTIONS = ids;

/**
 * The rail's chips for this page.
 *
 * "Now" is only rendered where there is a hero or something in flight, so whether it is there is
 * passed in rather than derived a second time — one test answered once cannot come apart from
 * itself.
 */
export const showSections = (hasNow: boolean) => chips({ now: hasNow });
