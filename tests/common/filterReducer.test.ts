import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { countActiveFilters, yearPredicates } from "../../src/common/filterReducer";
import { activeCount, initialState, reducer, type FilterState } from "../../src/game/filterUtils";
import { videoGame } from "../fixtures/gameRows";

describe("yearPredicates", () => {
  /** The reading three of the four sheets take, spelled out because no default offers it. */
  const started = (item: { startDate: { year: YearNumber } }) => item.startDate.year;

  it("returns no predicate when the ceiling has reached the current year", () => {
    // "Up to this year" is the same as no filter, which is why the default state hides nothing.
    expect(yearPredicates({ yearType: "upto", yearTo: CURRENT_YEAR }, started)).toEqual([]);
  });

  it("returns one ceiling predicate for an earlier year", () => {
    const ceiling = (CURRENT_YEAR - 1) as YearNumber;
    const [keep] = yearPredicates({ yearType: "upto", yearTo: ceiling }, started);

    expect(keep({ startDate: { year: ceiling } })).toBe(true);
    expect(keep({ startDate: { year: CURRENT_YEAR } })).toBe(false);
  });

  it("reads the year through the caller's accessor, for a model that attributes differently", () => {
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
    const [keep] = yearPredicates({ yearType: "matching", yearTo: CURRENT_YEAR }, started);

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

  it("names the whole scope and rebuilds, since the predicate depends on both halves", () => {
    const matching = reducer(initialState, { type: "scope", yearTo: CURRENT_YEAR, yearType: "matching" });

    expect(matching.yearType).toBe("matching");
    expect(matching.yearTo).toBe(CURRENT_YEAR);
    expect(matching.filter).not.toBe(initialState.filter);
    expect(matching.filter(videoGame({ startDate: YearMonthDay.get(2017, 3, 3) }))).toBe(false);

    expect(reducer(matching, { type: "scope", yearTo: CURRENT_YEAR, yearType: "upto" }).yearType).toBe("upto");
  });

  it("rebuilds where only the year moves, the reading standing", () => {
    // Both halves are read by the same predicate, so a scope that keeps its reading and names
    // another year is as much a new predicate as one that swaps the reading.
    const lastYear = (CURRENT_YEAR - 1) as YearNumber;
    const scoped = reducer(initialState, { type: "scope", yearTo: lastYear, yearType: "upto" });

    expect(scoped.yearTo).toBe(lastYear);
    expect(scoped.filter).not.toBe(initialState.filter);
  });

  it("keeps a ceiling reading of the scope beside the exact one", () => {
    // The vitals band's first card is titled "All time" or "Up to 2019" under either reading, so it
    // counts the rows the ceiling keeps: under "In 2026" that is the whole library, and under "In
    // 2019" everything up to it, where `filter` alone holds the one year.
    const earlier = videoGame({ startDate: YearMonthDay.get(2017, 3, 3) });
    const matching = reducer(initialState, { type: "scope", yearTo: CURRENT_YEAR, yearType: "matching" });

    expect(matching.filter(earlier)).toBe(false);
    expect(matching.filterUpTo(earlier)).toBe(true);
    expect(matching.filterUpTo).not.toBe(matching.filter);

    const inYear = reducer(initialState, { type: "scope", yearTo: 2019 as YearNumber, yearType: "matching" });

    expect(inYear.filterUpTo(earlier)).toBe(true);
    expect(inYear.filterUpTo(videoGame({ startDate: YearMonthDay.get(2021, 3, 3) }))).toBe(false);
  });

  it("makes the ceiling reading the one predicate, by identity, under the ceiling itself", () => {
    // A consumer keyed on either predicate then re-filters once per change and not twice.
    expect(initialState.filterUpTo).toBe(initialState.filter);

    const scoped = reducer(initialState, { type: "scope", yearTo: 2019 as YearNumber, yearType: "upto" });

    expect(scoped.filterUpTo).toBe(scoped.filter);
  });

  it("answers the same state object for the scope already held", () => {
    // The control has a state per reading, so picking the lit one has to cost neither a render
    // nor a fresh pass over the whole library.
    const matching = reducer(initialState, { type: "scope", yearTo: CURRENT_YEAR, yearType: "matching" });

    expect(reducer(matching, { type: "scope", yearTo: CURRENT_YEAR, yearType: "matching" })).toBe(matching);
  });
});

describe("retain", () => {
  const picked = (...franchises: string[]): FilterState =>
    reducer(initialState, { type: "updateFilter", filter: "franchise", value: franchises });

  it("drops a value the library no longer offers and keeps the rest", () => {
    // A select's options are computed over the visible library, so a value guest mode takes out of
    // it would otherwise stay selected with no chip left to clear it, and every chart on the page
    // would narrow to nothing for a choice the reader can no longer see.
    const held = reducer(picked("Zelda", "Pokémon"), {
      type: "retain",
      category: "franchise",
      values: ["Mario", "Zelda"],
    });

    expect(held.franchise).toEqual(["Zelda"]);
  });

  it("answers the same state object when every value is still on offer", () => {
    // The sweep runs whenever a library lands, on every tab. A fresh state per run would rebuild
    // the composed predicate and re-filter every chart in the app for no change at all.
    const before = picked("Zelda");

    expect(reducer(before, { type: "retain", category: "franchise", values: ["Mario", "Zelda"] })).toBe(before);
  });

  it("answers the same state object for an untouched category, whatever is on offer", () => {
    expect(reducer(initialState, { type: "retain", category: "genre", values: [] })).toBe(initialState);
  });

  it("rebuilds the composed predicate for what it did drop", () => {
    const held = reducer(picked("Zelda"), { type: "retain", category: "franchise", values: [] });

    expect(held.franchise).toEqual([]);
    expect(held.filter).not.toBe(initialState.filter);
    expect(held.filter(videoGame({ franchise: "Mario" }))).toBe(true);
  });
});

describe("resetFilters", () => {
  const dirty = (): FilterState =>
    [
      { type: "updateFilter", filter: "endless", value: false },
      { type: "updateFilter", filter: "franchise", value: ["Zelda"] },
      { type: "scope", yearTo: CURRENT_YEAR, yearType: "matching" },
      { type: "measure", measure: "Hours" },
    ].reduce<FilterState>((state, action) => reducer(state, action as never), initialState);

  it("restores every filter field to its initial value", () => {
    const cleared = reducer(dirty(), { type: "resetFilters" });

    expect(cleared.endless).toBe(true);
    expect(cleared.franchise).toEqual([]);
  });

  it("keeps the measure and the year scope, which are controls of their own", () => {
    // Neither is on the filter surface Clear belongs to: the measure is the unit every figure on
    // the tab is counted in, and the scope states on its own face that it is on. Clearing filters
    // leaves a reader counting hours in one year exactly where they were.
    const cleared = reducer(dirty(), { type: "resetFilters" });

    expect(cleared.measure).toBe("Hours");
    expect(cleared.yearType).toBe("matching");
  });

  it("keeps the year the scope names", () => {
    const scoped = reducer(initialState, {
      type: "scope",
      yearTo: (CURRENT_YEAR - 1) as YearNumber,
      yearType: "upto",
    });

    expect(reducer(scoped, { type: "resetFilters" }).yearTo).toBe(CURRENT_YEAR - 1);
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

  it("ignores the measure, the composed predicate and the year scope", () => {
    // None of the four is a field on the filter surface the badge sits on: two are not filters at
    // all, and the scope is a control beside it that lights itself.
    const state = [
      { type: "measure", measure: "Hours" },
      { type: "scope", yearTo: (CURRENT_YEAR - 1) as YearNumber, yearType: "matching" },
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
