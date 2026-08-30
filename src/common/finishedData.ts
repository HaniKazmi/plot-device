import { PlainDate, type Year, type YearMonthDay } from "./date";
import "../utils/arrayUtils";

export type FinishedItem = {
  banner?: string;
  startDate?: YearMonthDay | Year;
  name: string;
};

export type FinishedSort = "Date" | "Name";

/**
 * The items a Finished grid shows: only those with artwork, newest first.
 *
 * "Name" applies no sort at all — there is no branch for it — so it returns the data in the
 * order the converter produced it, which is sheet order. That reads as name-ordered only
 * because the spreadsheets happen to be maintained that way.
 */
export const finishedItems = <U extends FinishedItem>(data: readonly U[], sort: FinishedSort): U[] => {
  const withBanners = data.filter((item) => item.banner);
  return sort === "Date" ? withBanners.sortByKey("startDate", false) : withBanners;
};

/**
 * Where an item falls in the current sort, as the short label a position marker can show: a year
 * under the date sort, a leading letter under the name sort.
 *
 * The value read is the one `finishedItems` orders by, so the marker and the wall cannot come to
 * disagree about which field is in play. The year comes from `firstDay()` rather than a `year`
 * field, which only the concrete subclasses carry, so a bare `Year` and a full date answer alike.
 *
 * `null` is a real answer and not a fallback: a value kind with no short form has none, and an
 * item with no date is one the date sort places first, so the topmost card on screen can be one.
 * The marker then shows nothing rather than the year of some other row.
 */
export const finishedBucket = (item: FinishedItem, sort: FinishedSort): string | null => {
  const value: PlainDate | string | undefined = sort === "Date" ? item.startDate : item.name;
  if (value instanceof PlainDate) return String(value.firstDay().year);
  if (typeof value === "string") return value.charAt(0).toUpperCase() || null;
  return null;
};

/**
 * The buckets a wall contains, each at its first appearance and in the order the wall presents
 * them — years descending under the date sort, letters in whatever order the franchise-grouped
 * sheet order reaches them under the name sort.
 *
 * Wall order rather than sorted order is what makes a jump rail readable as a position: the
 * highlight travels down it as the reader scrolls down the page. Re-sorting the letters would
 * make it jump about instead.
 *
 * Cards with no bucket carry no label at all, so an undated item contributes nothing rather than
 * an empty entry.
 */
export const orderedBuckets = (labels: readonly (string | null | undefined)[]): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  labels.forEach((label) => {
    if (!label || seen.has(label)) return;
    seen.add(label);
    ordered.push(label);
  });
  return ordered;
};

/**
 * A bucket as a jump rail draws it: a year in the two-digit form the timeline's year chips use,
 * anything else as itself.
 *
 * The rail is a column a chip wide in the page's gutter, so a four-digit year is the one label
 * that would set that column's width by itself.
 */
export const bucketLabel = (bucket: string): string => (/^\d{4}$/.test(bucket) ? `'${bucket.slice(-2)}` : bucket);
