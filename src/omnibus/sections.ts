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
 * Every section but the vitals is rendered only where it has something to say, so whether each is
 * there is passed in rather than derived a second time — one test answered once cannot come apart
 * from itself. Crossings and Genres are both about a franchise or a genre spanning more than one
 * medium, so a reader who has switched two of the three off empties them structurally rather than
 * by accident; the two browse surfaces empty where the filters leave nothing with artwork, and
 * nothing finished, respectively; the chart empties where the filters leave nothing at all.
 *
 * The vitals band is the one section that always stands, because a total of zero is a true answer
 * to how much — where a chart of nothing is not a picture of nothing, it is a picture of whatever
 * an empty pivot leaves the plotting library to invent.
 */
export const omnibusSections = (has: {
  now: boolean;
  charts: boolean;
  crossings: boolean;
  gallery: boolean;
  finished: boolean;
  genres: boolean;
}) => [
  ...(has.now ? [{ id: OMNIBUS_SECTIONS.now, label: "Now" }] : []),
  { id: OMNIBUS_SECTIONS.vitals, label: "Vitals" },
  ...(has.charts ? [{ id: OMNIBUS_SECTIONS.charts, label: "By Year" }] : []),
  ...(has.crossings ? [{ id: OMNIBUS_SECTIONS.crossings, label: "Crossings" }] : []),
  ...(has.gallery ? [{ id: OMNIBUS_SECTIONS.gallery, label: "Gallery" }] : []),
  ...(has.finished ? [{ id: OMNIBUS_SECTIONS.finished, label: "Finished" }] : []),
  ...(has.genres ? [{ id: OMNIBUS_SECTIONS.genres, label: "Genres" }] : []),
];
