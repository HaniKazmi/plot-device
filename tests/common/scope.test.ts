import { describe, expect, it } from "vitest";
import { isAllTime, scopeLabel, steppedScope, toggledScope } from "../../src/common/scope";
import { CURRENT_YEAR, type YearNumber } from "../../src/common/date";

const year = (value: number) => value as YearNumber;

/**
 * Every expectation is relative to `CURRENT_YEAR`, which comes off the real clock at module load:
 * a literal year here would start failing on New Year's Day.
 */
describe("isAllTime", () => {
  it("is the whole library: a ceiling that has reached the current year", () => {
    expect(isAllTime(year(CURRENT_YEAR), "upto", CURRENT_YEAR)).toBe(true);
  });

  it("is not an earlier ceiling", () => {
    expect(isAllTime(year(CURRENT_YEAR - 7), "upto", CURRENT_YEAR)).toBe(false);
  });

  it("is not the current year read as one year, which is a subset of it", () => {
    expect(isAllTime(year(CURRENT_YEAR), "matching", CURRENT_YEAR)).toBe(false);
  });
});

describe("scopeLabel", () => {
  it("says nothing of a year where the ceiling holds every row", () => {
    expect(scopeLabel(year(CURRENT_YEAR), "upto", CURRENT_YEAR)).toBe("All time");
  });

  it("names the ceiling where it cuts", () => {
    expect(scopeLabel(year(2019), "upto", CURRENT_YEAR)).toBe("Up to 2019");
  });

  it("names the year a single-year reading is in, the current one included", () => {
    expect(scopeLabel(year(2019), "matching", CURRENT_YEAR)).toBe("In 2019");
    expect(scopeLabel(year(CURRENT_YEAR), "matching", CURRENT_YEAR)).toBe(`In ${CURRENT_YEAR}`);
  });

  /**
   * The two vitals cards each title themselves with the reading they stand for, not the one the
   * page is in, so the label of a reading nothing has selected has to be answerable.
   */
  it("answers for a reading the page is not in, the current year being a parameter", () => {
    expect(scopeLabel(year(2019), "upto", 2019)).toBe("All time");
    expect(scopeLabel(year(2019), "upto", 2020)).toBe("Up to 2019");
  });
});

describe("toggledScope", () => {
  it("narrows a page reading everything to the year in progress", () => {
    expect(toggledScope(year(CURRENT_YEAR), "upto", CURRENT_YEAR)).toEqual({
      yearTo: CURRENT_YEAR,
      yearType: "matching",
    });
  });

  it("widens any other reading back to everything, whichever year it held", () => {
    const allTime = { yearTo: CURRENT_YEAR, yearType: "upto" };
    expect(toggledScope(year(CURRENT_YEAR), "matching", CURRENT_YEAR)).toEqual(allTime);
    expect(toggledScope(year(CURRENT_YEAR - 7), "upto", CURRENT_YEAR)).toEqual(allTime);
    expect(toggledScope(year(CURRENT_YEAR - 7), "matching", CURRENT_YEAR)).toEqual(allTime);
  });
});

describe("steppedScope", () => {
  const earliest = CURRENT_YEAR - 10;

  it("steps a scoped page a year either way, keeping its reading", () => {
    expect(steppedScope(year(CURRENT_YEAR - 3), "matching", -1, earliest, CURRENT_YEAR)).toEqual({
      yearTo: CURRENT_YEAR - 4,
      yearType: "matching",
    });
    expect(steppedScope(year(CURRENT_YEAR - 3), "upto", 1, earliest, CURRENT_YEAR)).toEqual({
      yearTo: CURRENT_YEAR - 2,
      yearType: "upto",
    });
  });

  it("steps everything back to up to last year, and nowhere forward", () => {
    expect(steppedScope(year(CURRENT_YEAR), "upto", -1, earliest, CURRENT_YEAR)).toEqual({
      yearTo: CURRENT_YEAR - 1,
      yearType: "upto",
    });
    expect(steppedScope(year(CURRENT_YEAR), "upto", 1, earliest, CURRENT_YEAR)).toBeUndefined();
  });

  it("stops at the library's first year and at the current one", () => {
    expect(steppedScope(year(earliest), "matching", -1, earliest, CURRENT_YEAR)).toBeUndefined();
    expect(steppedScope(year(CURRENT_YEAR), "matching", 1, earliest, CURRENT_YEAR)).toBeUndefined();
  });

  it("reads an up-to scope stepped onto the current year as everything, that reading's own meaning", () => {
    const stepped = steppedScope(year(CURRENT_YEAR - 1), "upto", 1, earliest, CURRENT_YEAR);
    expect(stepped && isAllTime(stepped.yearTo, stepped.yearType, CURRENT_YEAR)).toBe(true);
  });
});
