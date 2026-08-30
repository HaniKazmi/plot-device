import { describe, expect, it } from "vitest";
import { Year, YearMonthDay, formatDate, formatDateRange } from "../../src/common/date";

describe("formatDateRange", () => {
  it("names the year once when both ends share it", () => {
    expect(formatDateRange(YearMonthDay.get(2023, 9, 6), YearMonthDay.get(2023, 10, 20))).toBe("6 Sep – 20 Oct 2023");
  });

  it("names both years when the range crosses one", () => {
    expect(formatDateRange(YearMonthDay.get(2008, 9, 10), YearMonthDay.get(2009, 5, 13))).toBe(
      "10 Sep 2008 – 13 May 2009",
    );
  });

  it("gives a single day once rather than as a range against itself", () => {
    expect(formatDateRange(YearMonthDay.get(2023, 9, 6), YearMonthDay.get(2023, 9, 6))).toBe("6 Sep 2023");
  });

  it("says present for a range with no end", () => {
    expect(formatDateRange(YearMonthDay.get(2023, 9, 6))).toBe("6 Sep 2023 – present");
  });

  it("gives only the year where only a year was recorded", () => {
    expect(formatDateRange(Year.get(2009), Year.get(2009))).toBe("2009");
  });

  it("mixes precisions rather than inventing a day for the year-only end", () => {
    expect(formatDateRange(YearMonthDay.get(2009, 3, 1), Year.get(2009))).toBe("1 Mar – 2009");
  });
});

describe("formatDate", () => {
  it("always names the year, having no other end to share one with", () => {
    expect(formatDate(YearMonthDay.get(2023, 9, 6))).toBe("6 Sep 2023");
  });

  it("gives back just the year where that is all the source recorded", () => {
    expect(formatDate(Year.get(2009))).toBe("2009");
  });
});
