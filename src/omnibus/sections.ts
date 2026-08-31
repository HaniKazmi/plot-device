/**
 * The anchors the page's sticky rail scrolls to, in the order the page runs.
 *
 * They live apart from both the components that carry them and the one that builds the rail,
 * because those are the two halves that have to agree: `Stats` owns the bands above the charts,
 * `Graphs` everything below, and an id written out twice is an id that can be changed once.
 *
 * The map names every anchor the finished page has; `omnibusSections` offers only the chips that
 * are actually rendered, so a chip never points at an anchor that is not there.
 */
export const OMNIBUS_SECTIONS = {
  now: "omnibus-now",
  vitals: "omnibus-vitals",
  charts: "omnibus-charts",
  crossings: "omnibus-crossings",
  gallery: "omnibus-gallery",
  finished: "omnibus-finished",
  genres: "omnibus-genres",
} as const;

/**
 * The rail's chips for this page.
 *
 * The Now band is rendered only where at least one medium has something in flight, so whether it
 * is there is passed in rather than derived a second time — one test answered once cannot come
 * apart from itself.
 */
export const omnibusSections = (hasNow: boolean) => [
  ...(hasNow ? [{ id: OMNIBUS_SECTIONS.now, label: "Now" }] : []),
  { id: OMNIBUS_SECTIONS.vitals, label: "Vitals" },
];
