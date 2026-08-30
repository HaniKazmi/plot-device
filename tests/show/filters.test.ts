import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { filters, initialState, type FilterState } from "../../src/show/filterUtils";
import { show } from "../fixtures/shows";

const state = (overrides: Partial<FilterState> = {}): Omit<FilterState, "filter"> => ({
  ...initialState,
  ...overrides,
});

describe("the default state", () => {
  it("is a no-op, because the year ceiling starts at the current year and guest mode is off", () => {
    // Shows have no filter UI beyond the measure toggle, so this is the only state most
    // sessions ever see.
    const keep = filters(state());

    expect(keep(show({ type: "anime" }))).toBe(true);
    expect(keep(show({ startDate: YearMonthDay.get(2008, 1, 1) }))).toBe(true);
  });
});

describe("guest mode", () => {
  it("hides anime, which is what guest mode means on this tab", () => {
    // The same flag hides adult-themed games on the games tab — same switch, different rule.
    const keep = filters(state({ guestMode: true }));

    expect(keep(show({ type: "anime" }))).toBe(false);
    expect(keep(show({ type: "show" }))).toBe(true);
  });
});

describe("the year cutoff", () => {
  it("carries the shared year fields even though no control renders them yet", () => {
    const keep = filters(state({ yearType: "matching", yearTo: 2022 as YearNumber }));

    expect(keep(show({ startDate: YearMonthDay.get(2022, 2, 18) }))).toBe(true);
    expect(keep(show({ startDate: YearMonthDay.get(2021, 2, 18) }))).toBe(false);
  });

  it("applies an earlier ceiling the same way the games tab does", () => {
    const ceiling = (CURRENT_YEAR - 1) as YearNumber;
    const keep = filters(state({ yearType: "upto", yearTo: ceiling }));

    expect(keep(show({ startDate: YearMonthDay.get(ceiling, 1, 1) }))).toBe(true);
    expect(keep(show({ startDate: YearMonthDay.get(CURRENT_YEAR, 1, 1) }))).toBe(false);
  });
});
