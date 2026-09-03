import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { countActiveFilters, yearPredicates } from "../../src/common/filterReducer";
import { activeCount, initialState, reducer, type FilterState } from "../../src/vg/filterUtils";
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

  it("reads the year through a caller's own accessor, for a model that attributes differently", () => {
    // The two rules are the same everywhere; which year an item answers with is not. An Omnibus
    // item counts towards the year it closed in and carries no start date to read at all.
    const closed = (year: YearNumber) => ({ closedIn: year });
    const [keep] = yearPredicates(
      { yearType: "matching", yearTo: CURRENT_YEAR },
      (item: { closedIn: YearNumber }) => item.closedIn,
    );

    expect(keep(closed(CURRENT_YEAR))).toBe(true);
    expect(keep(closed((CURRENT_YEAR - 1) as YearNumber))).toBe(false);
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

  it("keeps the same predicate across a measure change", () => {
    // Consumers memoise the filtered list on `filter` identity, and no domain's filters() reads
    // the measure. Rebuilding here would re-filter the whole dataset on every unit switch.
    const next = reducer(initialState, { type: "measure", measure: "Hours" });

    expect(next.measure).toBe("Hours");
    expect(next.filter).toBe(initialState.filter);
  });

  it("sets the measure named rather than advancing to the next one", () => {
    // A segment per measure means a press names its own state, so setting the measure already
    // held has to be a no-op rather than a move.
    const hours = reducer(initialState, { type: "measure", measure: "Hours" });

    expect(reducer(hours, { type: "measure", measure: "Games" }).measure).toBe("Games");
  });

  it("answers the same state object for a measure already held, so a press costs no render", () => {
    const hours = reducer(initialState, { type: "measure", measure: "Hours" });

    expect(reducer(hours, { type: "measure", measure: "Hours" })).toBe(hours);
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
    const changed = reducer(initialState, { type: "measure", measure: "Hours" });

    expect(reducer(changed, { type: "resetFilters" }).measure).toBe("Games");
  });

  it("leaves the previous state object untouched", () => {
    const before = dirty();
    reducer(before, { type: "resetFilters" });

    expect(before.endless).toBe(false);
    expect(before.franchise).toEqual(["Zelda"]);
  });
});

describe("countActiveFilters", () => {
  it("counts nothing in the state the page opens on", () => {
    expect(activeCount(initialState)).toBe(0);
  });

  it("counts a toggle switched off", () => {
    expect(activeCount(reducer(initialState, { type: "updateFilter", filter: "endless", value: false }))).toBe(1);
  });

  it("counts a category once however many values it holds", () => {
    // The badge says how many controls the reader has touched, not how many predicates that made:
    // three genres picked in one select is one choice, undone in one place.
    const three = reducer(initialState, {
      type: "updateFilter",
      filter: "genre",
      value: ["Action", "Puzzle", "Racing"],
    });

    expect(activeCount(three)).toBe(1);
  });

  it("counts a cleared category as nothing, though the array is a fresh one", () => {
    // Clearing a select hands back a new empty array, so identity alone would report a choice the
    // reader has just undone.
    const cleared = [
      { type: "updateFilter", filter: "genre", value: ["Action"] },
      { type: "updateFilter", filter: "genre", value: [] },
    ].reduce<FilterState>((state, action) => reducer(state, action as never), initialState);

    expect(activeCount(cleared)).toBe(0);
  });

  it("counts a changed year", () => {
    expect(
      activeCount(
        reducer(initialState, { type: "updateFilter", filter: "yearTo", value: (CURRENT_YEAR - 1) as never }),
      ),
    ).toBe(1);
  });

  it("ignores the measure, the composed predicate and guest mode", () => {
    // None of the three is something the drawer can clear: two are not filters at all, and guest
    // mode is set by a long press on the app bar and survives Clear on purpose.
    const state = [
      { type: "measure", measure: "Hours" },
      { type: "updateFilter", filter: "guestMode", value: true },
    ].reduce<FilterState>((next, action) => reducer(next, action as never), initialState);

    expect(state.filter).not.toBe(initialState.filter);
    expect(activeCount(state)).toBe(0);
  });

  it("counts each changed field, over any state shape", () => {
    // The rule is stated over plain objects because it is the same rule in five domains that
    // share no field beyond the base ones.
    expect(countActiveFilters({ a: 1, b: "x" }, { a: 1, b: "y" })).toBe(1);
    expect(countActiveFilters({ a: 2, b: "y" }, { a: 1, b: "y" })).toBe(1);
    expect(countActiveFilters({ a: 2, b: "x" }, { a: 1, b: "y" })).toBe(2);
  });
});
