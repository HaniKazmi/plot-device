import { tabSections } from "../common/sections";

const { ids, chips } = tabSections("omnibus", [
  { key: "now", label: "Now" },
  { key: "vitals", label: "Vitals" },
  { key: "timeline", label: "Timeline" },
  { key: "finished", label: "Finished" },
  { key: "charts", label: "By Year" },
  { key: "genres", label: "Genres" },
  { key: "crossings", label: "Franchises" },
  { key: "library", label: "Library" },
]);

/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs at every width.
 *
 * That order is the tracked tabs' own: by temperature, warmest first, with a timeline near the top
 * and the library closing the page. What is in flight, then how much there is of it, then when it
 * all ran and what has just closed — the answers a reader arrives for — before the shape of the
 * library over time and the two readings that divide it by medium, which a reader goes looking for
 * rather than lands on, and last the library, the section built to be scrolled into and stayed in.
 */
export const OMNIBUS_SECTIONS = ids;

/**
 * The rail's chips for this page.
 *
 * Every section but the vitals is rendered only where it has something to say, so whether each is
 * there is passed in rather than derived a second time. Franchises empties only where the filters
 * leave no franchise at all, Genres where every entry left logged no time — and neither is emptied
 * by narrowing to one medium, since a single medium is a lane and a full bar rather than nothing to
 * draw; the library empties where the filters leave
 * nothing with artwork, and the finished strip where they leave nothing closed; the chart and the
 * timeline empty where the filters leave nothing at all.
 *
 * The vitals band is the one section that always stands, and so is the one the caller says nothing
 * about: a total of zero is a true answer to how much, where a chart of nothing is not a picture
 * of nothing, it is a picture of whatever an empty pivot leaves the plotting library to invent.
 */
export const omnibusSections = (has: {
  now: boolean;
  timeline: boolean;
  charts: boolean;
  crossings: boolean;
  library: boolean;
  finished: boolean;
  genres: boolean;
}) => chips(has);

const franchise = tabSections("franchise", [
  { key: "vitals", label: "Vitals" },
  { key: "when", label: "When" },
  { key: "years", label: "By year" },
  { key: "credits", label: "Who made it" },
  { key: "library", label: "Library" },
]);

/**
 * The anchors of a franchise's own page, in the order it runs: how much there is of it, when it
 * ran and how much of it each year held, who made it, and its library last, the section a reader scrolls into and stays in. Every
 * section stands whatever the franchise holds — one work is still a total, a mark, a maker and a
 * shelf — so the page says nothing about which are there.
 */
export const FRANCHISE_SECTIONS = franchise.ids;
export const FRANCHISE_CHIPS = franchise.chips();
