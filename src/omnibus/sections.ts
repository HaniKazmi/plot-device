import { tabSections } from "../common/sections";

const { ids, chips } = tabSections("omnibus", [
  { key: "now", label: "Now" },
  { key: "vitals", label: "Vitals" },
  { key: "finished", label: "Finished" },
  { key: "charts", label: "By Year" },
  { key: "gallery", label: "Gallery" },
  { key: "genres", label: "Genres" },
  { key: "crossings", label: "Crossings" },
]);

/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs.
 *
 * That order is the tracked tabs' own: by temperature, warmest first. What is in flight, then how
 * much there is of it, then what has just closed — the three answers a reader arrives for — before
 * the shape of the library over time, the wall to browse, and last the two cross-media readings a
 * reader goes looking for rather than lands on. Crossings closes the page because it is the
 * narrowest question on it and the tallest thing that answers one: a dozen franchises, each a
 * stack of lanes, in a scroller three times the width of its own container.
 */
export const OMNIBUS_SECTIONS = ids;

/**
 * The rail's chips for this page.
 *
 * Every section but the vitals is rendered only where it has something to say, so whether each is
 * there is passed in rather than derived a second time. Crossings and Genres are both about a
 * franchise or a genre spanning more than one medium, so a reader who has switched two of the
 * three off empties them structurally rather than by accident; the two browse surfaces empty where
 * the filters leave nothing with artwork, and nothing finished, respectively; the chart empties
 * where the filters leave nothing at all.
 *
 * The vitals band is the one section that always stands, and so is the one the caller says nothing
 * about: a total of zero is a true answer to how much, where a chart of nothing is not a picture
 * of nothing, it is a picture of whatever an empty pivot leaves the plotting library to invent.
 */
export const omnibusSections = (has: {
  now: boolean;
  charts: boolean;
  crossings: boolean;
  gallery: boolean;
  finished: boolean;
  genres: boolean;
}) => chips(has);
