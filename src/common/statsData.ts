import { assignPercents } from "../utils/mathUtils";
import { CURRENT_YEAR, type YearNumber } from "./date";
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
 * A grouping answered once per option, for a page that asks the same one of the same data more
 * than once — the vitals band orders its genre segments by the grouping the Top card also draws,
 * and the Most Read card opens on the author grouping beside it. Each is a pass over the whole
 * library, so the second asking reads the first's answer. Built once per render's data and
 * measure, so a filter change starts it over.
 */
export const groupsOnce = <O, T>(group: (option: O) => DrilldownGroup<T>[]) => {
  const held = new Map<O, DrilldownGroup<T>[]>();
  return (option: O) => {
    let groups = held.get(option);
    if (groups === undefined) {
      groups = group(option);
      held.set(option, groups);
    }
    return groups;
  };
};

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

/**
 * The first year a library holds anything in, which is the floor a year select offers and where a
 * shared scale opens. Read from the data rather than fixed, because the sheets start in different
 * years and a sheet is a record still being entered. Falls back to the current year when the
 * library is empty, since a select then has nothing below it to offer anyway.
 */
export const earliestYear = <T>(items: readonly T[], yearOf: (item: T) => YearNumber): YearNumber =>
  items.reduce<YearNumber | undefined>(
    (earliest, item) => (!earliest || yearOf(item) < earliest ? yearOf(item) : earliest),
    undefined,
  ) ?? CURRENT_YEAR;

/**
 * The one line a strip card's words are held to: its first label row, cells joined.
 *
 * A card in a strip is 120px of artwork and a caption, so the two or three rows a card under a
 * banner prints have to become one. The first row is the one taken because it is where every label
 * builder in the app puts the date or, where the list has no date to state, its only row — a
 * finished game's hours, a show's episodes and hours, a group card's name and figure. The rows
 * below it hold the rest, and on this tab's mixed list the closing row is the item's *name*, which
 * a strip must not print: the artwork is what names a card here, and the name stays in its `alt`.
 *
 * Empty cells are dropped rather than joined through, since a builder writes `""` for a fact the
 * sheet is silent about and a caption opening on a separator reads as a missing word.
 */
export const stripCaption = (labels: string[][]): string => (labels[0] ?? []).filter(Boolean).join(" · ");

/**
 * A grouped strip's caption: the group's labels less the group's own name, which the fronting
 * artwork stands for — an author's name is printed on the cover, a franchise's on the banner. At
 * a cover's 80px a name beside its figure is an ellipsis before the figure, and the figure is what
 * the shelf is ordered by.
 */
export const groupCaption = (labels: string[][], name: string): string =>
  labels
    .flat()
    .filter((cell) => cell && cell !== name)
    .join(" · ");
