import { describe, expect, it } from "vitest";
import { shortYear, Year, YearMonth, YearMonthDay } from "../../src/common/date";

describe("firstDay and lastDay", () => {
  // A date's precision is carried by its class, but until these a caller could only get at one end
  // of the range it denotes, and only by knowing which subclass it held.
  it("gives a year its whole extent", () => {
    expect(Year.get(2008).firstDay()).toBe(YearMonthDay.get(2008, 1, 1));
    expect(Year.get(2008).lastDay()).toBe(YearMonthDay.get(2008, 12, 31));
  });

  it("gives a month its whole extent", () => {
    expect(YearMonth.get(2008, 6).firstDay()).toBe(YearMonthDay.get(2008, 6, 1));
    expect(YearMonth.get(2008, 6).lastDay()).toBe(YearMonthDay.get(2008, 6, 30));
  });

  it("ends February on the 29th in a leap year", () => {
    expect(YearMonth.get(2008, 2).lastDay()).toBe(YearMonthDay.get(2008, 2, 29));
    expect(YearMonth.get(2009, 2).lastDay()).toBe(YearMonthDay.get(2009, 2, 28));
  });

  it("leaves a full date alone at both ends", () => {
    const day = YearMonthDay.get(2008, 6, 15);

    expect(day.firstDay()).toBe(day);
    expect(day.lastDay()).toBe(day);
  });
});

describe("shortYear", () => {
  it("gives a year as a narrow scale labels one, with a typographic apostrophe", () => {
    expect(shortYear(2024)).toBe("\u201924");
  });

  it("pads a single-digit remainder, so a column of labels is one width", () => {
    expect(shortYear(2008)).toBe("\u201908");
    expect(shortYear(2000)).toBe("\u201900");
  });
});
