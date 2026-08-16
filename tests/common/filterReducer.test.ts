import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { yearPredicates } from "../../src/common/filterReducer";
import { initialState, reducer, type FilterState } from "../../src/vg/filterUtils";
import { videoGame } from "../fixtures/vgRows";

describe("yearPredicates", () => {
  it("returns no predicate when the ceiling has reached the current year", () => {
    // "Up to this year" is the same as no filter, which is why the default state hides nothing.
    expect(yearPredicates({ yearType: "upto", yearTo: CURRENT_YEAR })).toEqual([]);
  });

  it("returns one ceiling predicate for an earlier year", () => {
    const ceiling = (CURRENT_YEAR - 1) as YearNumber;
    const [keep] = yearPredicates({ yearType: "upto", yearTo: ceiling });

    expect(keep({ startDate: { year: ceiling } })).toBe(true);
    expect(keep({ startDate: { year: CURRENT_YEAR } })).toBe(false);
  });

  it("returns an exact-match predicate for the matching type, even at the current year", () => {
    const [keep] = yearPredicates({ yearType: "matching", yearTo: CURRENT_YEAR });

    expect(keep({ startDate: { year: CURRENT_YEAR } })).toBe(true);
    expect(keep({ startDate: { year: (CURRENT_YEAR - 1) as YearNumber } })).toBe(false);
  });
});

describe("the reducer rebuilds the composed predicate", () => {
  it("starts with a filter already composed, so the first render needs no dispatch", () => {
    expect(typeof initialState.filter).toBe("function");
    expect(initialState.filter(videoGame())).toBe(true);
  });

  it("gives updateFilter a new predicate that reflects the change", () => {
    const next = reducer(initialState, { type: "updateFilter", filter: "endless", value: false });

    expect(next.endless).toBe(false);
    expect(next.filter).not.toBe(initialState.filter);
    expect(next.filter(videoGame({ status: "Endless" }))).toBe(false);
  });

  it("keeps the same predicate across a measure toggle", () => {
    // Consumers memoise the filtered list on `filter` identity, and no domain's filters() reads
    // the measure. Rebuilding here would re-filter the whole dataset on every unit switch.
    const next = reducer(initialState, { type: "toggleMeasure" });

    expect(next.measure).toBe("Hours");
    expect(next.filter).toBe(initialState.filter);
  });

  it("cycles the measure back on a second toggle", () => {
    const twice = reducer(reducer(initialState, { type: "toggleMeasure" }), { type: "toggleMeasure" });

    expect(twice.measure).toBe("Games");
  });

  it("flips the year type and rebuilds, since the predicate depends on it", () => {
    const matching = reducer(initialState, { type: "toggleYearType" });

    expect(matching.yearType).toBe("matching");
    expect(matching.filter).not.toBe(initialState.filter);
    expect(matching.filter(videoGame({ startDate: YearMonthDay.get(2017, 3, 3) }))).toBe(false);

    expect(reducer(matching, { type: "toggleYearType" }).yearType).toBe("upto");
  });
});

describe("resetFilters", () => {
  const dirty = (): FilterState =>
    [
      { type: "updateFilter", filter: "endless", value: false },
      { type: "updateFilter", filter: "franchise", value: ["Zelda"] },
      { type: "toggleYearType" },
      { type: "updateFilter", filter: "guestMode", value: true },
    ].reduce<FilterState>((state, action) => reducer(state, action as never), initialState);

  it("restores every panel field to its initial value", () => {
    const cleared = reducer(dirty(), { type: "resetFilters" });

    expect(cleared.endless).toBe(true);
    expect(cleared.franchise).toEqual([]);
    expect(cleared.yearType).toBe("upto");
  });

  it("preserves guest mode, which the app sets rather than the filter panel", () => {
    // Clear must not become a way to unhide content the long-press deliberately hid.
    expect(reducer(dirty(), { type: "resetFilters" }).guestMode).toBe(true);
  });

  it("also resets the measure, because it restores from the initial values wholesale", () => {
    const toggled = reducer(initialState, { type: "toggleMeasure" });

    expect(reducer(toggled, { type: "resetFilters" }).measure).toBe("Games");
  });

  it("leaves the previous state object untouched", () => {
    const before = dirty();
    reducer(before, { type: "resetFilters" });

    expect(before.endless).toBe(false);
    expect(before.franchise).toEqual(["Zelda"]);
  });
});
