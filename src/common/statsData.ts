import { assignPercents } from "../utils/mathUtils";
import type { Colour } from "../utils/types";
import "../utils/arrayUtils";

/**
 * Turns a whitelist of group values into the proportional segments of a `TotalStack`, dropping
 * any group nothing falls into.
 *
 * The percentages are scoped to the segments actually drawn rather than to the whole dataset,
 * so the bar reads as "share of the groups shown". Measuring against the whole dataset instead
 * would leave a shortfall wherever `group` does not cover every value present — and
 * `assignPercents` folds its shortfall into the first entry, so that entire remainder would
 * silently inflate whichever group happens to be listed first.
 */
export const groupTotals = <T extends string, U, K extends keyof U>(
  data: U[],
  group: T[],
  groupKey: K,
  measureFunc: (data: U[]) => number,
  groupToColour: (ele: T) => Colour,
) => {
  const segments = group.flatMap((e) => {
    const count = measureFunc(data.filter((item) => item[groupKey] === e));
    return count > 0 ? [{ name: e, count, colour: groupToColour(e) }] : [];
  });

  return assignPercents(segments, segments.sum("count"));
};
