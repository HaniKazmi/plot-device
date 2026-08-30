import { assignPercents } from "../utils/mathUtils";
import type { Colour } from "../utils/types";
import "../utils/arrayUtils";

/** One group of a Top list: its name, its share of the measure, and its biggest item for artwork. */
export interface TopGroup<T> {
  name: string;
  count: number;
  top?: T;
}

/**
 * The top `limit` groups plus an "Other" bucket holding the rest, as percentages.
 *
 * Takes groups already reduced and ordered largest-first — how a domain groups and measures is
 * its own. The percentages are scoped to the rows returned rather than to the whole dataset, so
 * they always sum to 100 — "Other" is what makes that true. The bucket carries no `top` item,
 * because it stands for several groups at once.
 */
export const topNWithOther = <T>(allGroups: TopGroup<T>[], limit = 5) => {
  const grouped: TopGroup<T>[] = allGroups.slice(0, limit);
  const other = allGroups.slice(limit);
  if (other.length > 0) grouped.push({ name: "Other", count: other.sum("count") });

  return assignPercents(grouped, grouped.sum("count"));
};

/**
 * Turns a whitelist of group values into the proportional segments of a `TotalsBand`, dropping
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
  // Bucketed in one pass rather than filtering per group, which would walk the whole dataset
  // once for every entry in `group`.
  const buckets = new Map<T, U[]>(group.map((e) => [e, []]));
  for (const item of data) {
    buckets.get(item[groupKey] as T)?.push(item);
  }

  const segments = group.flatMap((e) => {
    const count = measureFunc(buckets.get(e)!);
    return count > 0 ? [{ name: e, count, colour: groupToColour(e) }] : [];
  });

  return assignPercents(segments, segments.sum("count"));
};
