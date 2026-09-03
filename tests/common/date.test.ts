import { describe, expect, it } from "vitest";
import { daysSince, shortYear, Year, YearMonth, YearMonthDay } from "../../src/common/date";

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

describe("daysTo", () => {
  // The one place the app decides whether a pair of dates is transposed, so every duration and
  // every span drawn on a chart inherits this answer.
  const day = (y: number, m: number, d: number) => YearMonthDay.get(y, m, d);

  it("counts inclusively between two full dates", () => {
    expect(day(2016, 12, 31).daysTo(day(2017, 1, 1))).toBe(2);
  });

  it("throws on a genuinely transposed pair, which is a sheet fault worth stopping for", () => {
    expect(() => day(2017, 4, 1).daysTo(day(2017, 3, 3))).toThrow("Invalid comparison");
  });

  it("answers undefined across mixed precision rather than inventing a day", () => {
    // Either order, and whether or not the two share a year. Compared as themselves a January 1st
    // stringifies longer than the year holding it, and so reads as later than its own year.
    expect(day(2020, 1, 15).daysTo(Year.get(2020))).toBeUndefined();
    expect(Year.get(2020).daysTo(day(2020, 1, 15))).toBeUndefined();
    expect(Year.get(2007).daysTo(day(2017, 4, 1))).toBeUndefined();
    expect(day(2007, 1, 1).daysTo(Year.get(2007))).toBeUndefined();
  });

  it("still throws where the two ranges cannot overlap at any precision", () => {
    // The whole of 2020 ends before this start, so no reading of either value puts them in order.
    expect(() => day(2021, 5, 1).daysTo(Year.get(2020))).toThrow("Invalid comparison");
  });

  it("answers undefined for two bare years, which name a span rather than a duration", () => {
    expect(Year.get(2007).daysTo(Year.get(2009))).toBeUndefined();
  });

  it("answers undefined for no end at all, which is how an open span degrades", () => {
    expect(day(2020, 1, 1).daysTo(undefined)).toBeUndefined();
  });
});

describe("daysSince", () => {
  it("counts from the start up to and including today", () => {
    expect(daysSince(YearMonthDay.get(2026, 5, 1), YearMonthDay.get(2026, 5, 1))).toBe(1);
    expect(daysSince(YearMonthDay.get(2026, 5, 1), YearMonthDay.get(2026, 9, 2))).toBe(125);
  });

  it("answers nothing for a start after today, where daysTo would throw", () => {
    expect(daysSince(YearMonthDay.get(2027, 1, 1), YearMonthDay.get(2026, 9, 2))).toBeUndefined();
  });
});
