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
