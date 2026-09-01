import { assignPercents } from "../utils/mathUtils";
import type { Colour } from "../utils/types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/** One group of a Top list: its name, its share of the measure, and its biggest item for artwork. */
export interface TopGroup<T> {
  name: string;
  count: number;
  top?: T;
}

/** A group that keeps its members, so a card fronting it can drill into what it is made of. */
export interface DrilldownGroup<T> extends TopGroup<T> {
  top: T;
  all: T[];
}

/**
 * Groups items by whatever `valueOf` answers, ordered by the measure, largest first.
 *
 * The four things that vary between tabs are all accessors: the group a row belongs to (skipped
 * when it answers `""`), how much a group counts for, which member fronts it as artwork, and
 * whether a group is worth keeping at all — the franchise rule, where a one-member group is a
 * standalone item naming itself rather than a series. The value is derived once per item, since
 * a category grouping runs once per Top card per render.
 */
export const groupByCategory = <T>(
  data: readonly T[],
  valueOf: (item: T) => string,
  measureOf: (items: T[]) => number,
  /** Which member fronts the group. Its first, where a caller reorders the members itself. */
  bestOf: (items: T[]) => T = (items) => items[0],
  keepGroup: (items: T[]) => boolean = () => true,
) => {
  const buckets = new Map<string, T[]>();
  for (const item of data) {
    const value = valueOf(item);
    if (value) buckets.setIfAbsent(value, []).push(item);
  }

  return (
    [...buckets.entries()]
      .filter(([, items]) => keepGroup(items))
      .map(([name, items]) => ({ name, count: measureOf(items), top: bestOf(items), all: items }))
      // A group measuring 0 is dropped rather than listed: `sortByKey` puts falsy values first in
      // both directions, so a 0 would head this largest-first list — and downstream, a run of
      // all-zero groups would hand `assignPercents` a zero total, spreading NaN across the whole
      // proportional bar. Under an Hours measure a real group can floor to 0.
      .filter((group) => group.count > 0)
      .sortByKey("count")
  );
};

/**
 * The franchise rule for `groupByCategory`: the column repeats a standalone item's own name, so a
 * one-member group is an item naming itself, not a series — while a series' first entry genuinely
 * shares the franchise's name and must stay in it.
 */
export const realFranchisesOnly = <T>(items: T[]) => items.length > 1;

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
export const groupTotals = <T extends string, U>(
  data: U[],
  group: T[],
  // An accessor rather than a key, so a derived grouping — a score band, a decade — costs the
  // caller a function instead of a field on the model.
  groupOf: (item: U) => T,
  measureFunc: (data: U[]) => number,
  groupToColour: (ele: T) => Colour,
) => {
  // Bucketed in one pass rather than filtering per group, which would walk the whole dataset
  // once for every entry in `group`.
  const buckets = new Map<T, U[]>(group.map((e) => [e, []]));
  for (const item of data) {
    buckets.get(groupOf(item))?.push(item);
  }

  const segments = group.flatMap((e) => {
    const count = measureFunc(buckets.get(e)!);
    return count > 0 ? [{ name: e, count, colour: groupToColour(e) }] : [];
  });

  return assignPercents(segments, segments.sum("count"));
};
