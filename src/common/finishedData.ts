import { PlainDate, shortYear, type Year, type YearMonthDay } from "./date";
import "../utils/arrayUtils";

export type FinishedItem = {
  banner?: string;
  startDate?: YearMonthDay | Year;
  /** Optional because only some domains date the work itself; see `finishedKey`. */
  releaseDate?: YearMonthDay | Year;
  name: string;
};

export type FinishedSort = "Date" | "Name";

/**
 * A stable identity for one card on the wall.
 *
 * A title is not unique: a remake carries its original's exactly, and three pairs on the movies
 * wall do — Rebecca, The Lion King, Peter Pan. Keyed on the name alone React cannot tell the two
 * apart and may render one of each pair in place of the other, or drop it.
 *
 * The release year is the half added because it is what a reader tells them apart by, and because
 * it never moves. A watch date separates the same three pairs today, but watching something again
 * rewrites it, and a key that changes remounts the card and loses its extracted artwork colour.
 * A domain that dates only the watching supplies no release date and keeps the bare name, which
 * is unique across every show and game on record.
 */
export const finishedKey = (item: FinishedItem) =>
  item.releaseDate ? `${item.name} (${item.releaseDate.year})` : item.name;

/**
 * The items a Finished grid shows: only those with artwork, newest first.
 *
 * "Name" applies no sort at all — there is no branch for it — so it returns the data in the
 * order the converter produced it, which is sheet order. That reads as name-ordered only
 * because the spreadsheets happen to be maintained that way.
 */
export const finishedItems = <U extends FinishedItem>(data: readonly U[], sort: FinishedSort): U[] => {
  const withBanners = data.filter(hasBanner);
  return sort === "Date" ? withBanners.sortByKey("startDate", false) : withBanners;
};

/** What the grid shows: artwork is the whole card, so an item without it is not on the wall. */
const hasBanner = (item: FinishedItem): boolean => !!item.banner;

/**
 * How many items a Finished grid holds, for a header that has to answer for the wall below it.
 *
 * It shares `finishedItems`' own filter rather than restating it, so a count and a wall cannot come
 * to disagree about what is on screen. The sort does not change the population, so none is asked
 * for.
 */
export const finishedCount = (data: readonly FinishedItem[]): number => data.filter(hasBanner).length;

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
 * What it guarantees is wall order, deduped to first appearance. What that buys depends on the
 * sort: the date sort's key is unique and ordered, so each year opens once and the highlight
 * travels down the rail as the reader scrolls down the page. The name sort's key is a letter, and
 * the franchise-grouped sheet order returns to a letter it has already passed, so the highlight
 * can jump back up to that letter's first run. Re-sorting the letters would not fix that and would
 * cost the rail its agreement with the wall.
 *
 * Cards with no bucket carry no label at all, so an undated item contributes nothing rather than
 * an empty entry.
 */
export const orderedBuckets = (labels: readonly (string | null | undefined)[]): string[] => [
  ...new Set(labels.filter((label): label is string => !!label)),
];

/**
 * A bucket as a jump rail draws it: a year in the two-digit form the timeline's year chips use,
 * anything else as itself.
 *
 * The rail is a column a chip wide in the page's gutter, so a four-digit year is the one label
 * that would set that column's width by itself.
 */
export const bucketLabel = (bucket: string): string => (/^\d{4}$/.test(bucket) ? shortYear(Number(bucket)) : bucket);
