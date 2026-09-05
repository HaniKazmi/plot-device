import type { Season } from "./types";

/** The Shows half a browse surface reaches for. See `vg/module.lazy.ts`. */
export { default as CardMediaImage, ShowHoverCard as HoverCard } from "./CardMediaImage";

/**
 * The show itself, which is exact: every season of one show holds the same object. A wall draws
 * one banner per show, where keying on the season would stand a six-season show on a shelf as six
 * copies of the same artwork and crowd every other show off the strip.
 */
export const work = (season: Season): unknown => season.show;

export const secondaryText = (season: Season) => [
  season.show.network,
  ...season.show.s.map((each) => each.subtitle ?? ""),
];

/**
 * Seasons rather than hours: how long a show ran is what a reader recognises it by, and the hours
 * a hit is told with are every season's together rather than this one's.
 */
export const facts = (season: Season) =>
  [season.show.s.length === 1 ? "1 season" : `${season.show.s.length} seasons`, season.show.status, season.show.network]
    .filter(Boolean)
    .join(" · ");
