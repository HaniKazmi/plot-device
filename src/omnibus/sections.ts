import { movedAfter, tabSections } from "../common/sections";

const { ids, keys, chips } = tabSections("omnibus", [
  { key: "now", label: "Now" },
  { key: "vitals", label: "Vitals" },
  { key: "finished", label: "Finished" },
  { key: "charts", label: "By Year" },
  { key: "gallery", label: "Gallery" },
  { key: "genres", label: "Genres" },
  { key: "crossings", label: "Franchises" },
]);

/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs from `sm` up.
 *
 * That order is the tracked tabs' own: by temperature, warmest first. What is in flight, then how
 * much there is of it, then what has just closed — the three answers a reader arrives for — before
 * the shape of the library over time, the wall to browse, and last the two readings that divide a
 * library by medium, which a reader goes looking for rather than lands on. On a phone the gallery
 * moves after Franchises instead (`omnibusSections`): the wall and the gallery are the two longest
 * sections on the page, each scrolled past rather than read at a glance, and only one of them can
 * close it.
 */
export const OMNIBUS_SECTIONS = ids;

/**
 * The rail's chips for this page.
 *
 * Every section but the vitals is rendered only where it has something to say, so whether each is
 * there is passed in rather than derived a second time. Franchises and Genres both empty on what
 * their own grouping leaves — a franchise that is only a work naming itself, a genre whose every
 * entry logged no time — and neither is emptied by narrowing to one medium, since a single medium
 * is a lane and a full bar rather than nothing to draw; the two browse surfaces empty where the
 * filters leave nothing with artwork, and nothing finished, respectively; the chart empties where
 * the filters leave nothing at all.
 *
 * The vitals band is the one section that always stands, and so is the one the caller says nothing
 * about: a total of zero is a true answer to how much, where a chart of nothing is not a picture
 * of nothing, it is a picture of whatever an empty pivot leaves the plotting library to invent.
 *
 * `phone` moves the Gallery chip after Franchises, matching the page's own reorder of the two
 * sections in the DOM (`Graphs.tsx`): the rail reads the current section as the first of *its*
 * order still in the band, so the list and the DOM have to say the same thing.
 */
export const omnibusSections = (
  has: {
    now: boolean;
    charts: boolean;
    crossings: boolean;
    gallery: boolean;
    finished: boolean;
    genres: boolean;
  },
  phone: boolean,
) => chips(has, phone ? movedAfter(keys, "gallery", "crossings") : keys);
