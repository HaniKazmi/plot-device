import { movedAfter, tabSections } from "../common/sections";

const { ids, keys, chips } = tabSections("books", [
  { key: "now", label: "Now" },
  { key: "vitals", label: "Vitals" },
  { key: "top", label: "Top" },
  { key: "explore", label: "Explore" },
  { key: "timeline", label: "Timeline" },
  { key: "charts", label: "Charts" },
  { key: "library", label: "Library" },
]);

/** The anchors the page's sticky rail scrolls to, in the order the page runs. */
export const BOOK_SECTIONS = ids;

/**
 * The rail's chips for this page.
 *
 * The hero is only rendered while a book is being read, so whether it is there is passed in
 * rather than derived a second time — one test answered once cannot come apart from itself.
 *
 * `chartsLast` is the phone's reading order: the library before the charts. The page renders the
 * two sections in that order too, and this list has to say the same thing — the rail reads the
 * current section as the first of *its* order still in view.
 */
export const bookSections = (hasNow: boolean, chartsLast: boolean) =>
  chips({ now: hasNow }, chartsLast ? movedAfter(keys, "charts", "library") : keys);
