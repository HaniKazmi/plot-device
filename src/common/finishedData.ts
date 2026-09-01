import { PlainDate, shortYear, type Year, type YearMonthDay } from "./date";
import "../utils/arrayUtils";

export type FinishedItem = {
  banner?: string;
  startDate?: YearMonthDay | Year;
  /** Optional because only some domains date the work itself; see `finishedKey`. */
  releaseDate?: YearMonthDay | Year;
  franchise: string;
  name: string;
};

export type FinishedSort = "Date" | "Franchise";

// Hoisted rather than calling localeCompare per comparison — the wall runs to a thousand cards and
// a sort touches each of them several times over.
const collator = new Intl.Collator();

/**
 * The series a work belongs to, falling back to its own title.
 *
 * All three sheets record the franchise raw, leaving a standalone work naming itself — "Dune" sits
 * in the Dune franchise. Where a cell is blank the title is what that column would have held, so
 * the fallback puts an unaffiliated work exactly where the sorted wall already puts its neighbours
 * rather than collecting every one of them under the empty string at the front. Trimmed first: a
 * cell holding a space is blank to a reader, and untrimmed it sorts ahead of every letter and hands
 * the jump rail a chip with nothing written on it.
 *
 * The raw cell, deliberately, where `franchiseOptions` puts the same column through
 * `namesTheSameThing` before offering it as a filter. The two ask different questions: that one
 * asks whether a franchise groups anything worth filtering by, and answers no for a work naming
 * itself; this one asks what a work sorts beside, and the raw cell is what groups a series whose
 * first entry shares its name. Normalising here would file "The Chronicles of Narnia" under its
 * title and its sequels under the franchise, splitting the shelf this sort exists to build.
 */
const franchiseKey = (item: FinishedItem) => item.franchise.trim() || item.name;

/**
 * Two dates in calendar order, with an undated item last.
 *
 * Compared rather than subtracted: `PlainDate.valueOf` answers the zero-padded ISO form, so `<`
 * orders a bare `Year` against a full date correctly and `daysTo` — which is undefined across
 * mixed precision and throws on an inverted pair — cannot be used to order anything.
 */
const byDate = (a?: PlainDate, b?: PlainDate) => {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
};

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
 * Any domain whose model names a field `releaseDate` is picked up here without touching this
 * module, which is how games get the same treatment. One that dates only the watching supplies
 * none and keeps the bare name — no two shows on record share a title.
 */
export const finishedKey = (item: FinishedItem) =>
  item.releaseDate ? `${item.name} (${item.releaseDate.year})` : item.name;

/**
 * The items a Finished grid shows: only those with artwork, in the order the reader asked for.
 *
 * "Date" is when the reader met each work, newest first. "Franchise" is the library as a shelf
 * instead: a series' entries together, in the order they were released, so a wall read top to
 * bottom walks each series through in turn. Release date rather than the reader's own start date,
 * because a series has an order of its own and the order it was watched in is not it — a reader
 * who came to Star Wars at the fourth film would otherwise see it lead.
 *
 * The last step is the start date, which is what settles a Shows wall: that model dates only the
 * watching, so every pair in it ties on release and falls through to here.
 */
export const finishedItems = <U extends FinishedItem>(data: readonly U[], sort: FinishedSort): U[] => {
  const withBanners = data.filter(hasBanner);
  if (sort === "Date") return withBanners.sortByKey("startDate", false);

  return withBanners.toSorted(
    (a, b) =>
      collator.compare(franchiseKey(a), franchiseKey(b)) ||
      byDate(a.releaseDate, b.releaseDate) ||
      byDate(a.startDate, b.startDate),
  );
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
 * under the date sort, a leading letter under the franchise sort.
 *
 * The value read is the one `finishedItems` orders by — the franchise sort's leading key, through
 * the same `franchiseKey` the comparator uses, so the marker and the wall cannot come to disagree
 * about which field is in play or about how a blank cell answers. The year comes from `firstDay()`
 * rather than a `year` field, which only the concrete subclasses carry, so a bare `Year` and a full
 * date answer alike.
 *
 * `null` is a real answer and not a fallback: a value kind with no short form has none, and an
 * item with no date is one the date sort places first, so the topmost card on screen can be one.
 * The marker then shows nothing rather than the year of some other row.
 */
export const finishedBucket = (item: FinishedItem, sort: FinishedSort): string | null => {
  const value: PlainDate | string | undefined = sort === "Date" ? item.startDate : franchiseKey(item);
  if (value instanceof PlainDate) return String(value.firstDay().year);
  if (typeof value === "string") return value.charAt(0).toUpperCase() || null;
  return null;
};

/**
 * The buckets a wall contains, each at its first appearance and in the order the wall presents
 * them — years descending under the date sort, initials ascending under the franchise sort.
 *
 * What it guarantees is wall order, deduped to first appearance, which is what keeps the rail
 * agreeing with the page rather than with a second derivation of it. Both sorts happen to open
 * each bucket once — a year is unique, and franchise-ordered initials are non-decreasing — so the
 * highlight only ever travels downwards as the reader scrolls down. Neither property is assumed
 * here: taking first appearances is correct for a key that returns to a value it has passed, and
 * re-sorting the labels would buy nothing while costing the agreement.
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
