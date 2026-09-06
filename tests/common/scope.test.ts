import { describe, expect, it } from "vitest";
import { isAllTime, scopeLabel } from "../../src/common/scope";
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
