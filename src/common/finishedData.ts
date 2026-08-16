import type { Year, YearMonthDay } from "./date";
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
