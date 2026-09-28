import { describe, expect, it } from "vitest";
import { daysSince, shortYear, YearMonthDay } from "../../src/common/date";

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
