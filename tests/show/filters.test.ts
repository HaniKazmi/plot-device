import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, type YearNumber } from "../../src/common/date";
import { filters, initialState, type FilterState } from "../../src/show/filterUtils";
import { show, showWithSeasonsIn } from "../fixtures/shows";

const state = (overrides: Partial<FilterState> = {}): Omit<FilterState, "filter"> => ({
  ...initialState,
  ...overrides,
});

describe("the default state", () => {
  it("is a no-op: every toggle is permissive, the year ceiling is the current year, guest mode is off", () => {
    const keep = filters(state());

    expect(keep(show({ type: "anime" }))).toBe(true);
    expect(keep(show({ status: "Abandoned" }))).toBe(true);
    expect(keep(showWithSeasonsIn(2008))).toBe(true);
  });
});

describe("toggles", () => {
  it("drops Abandoned shows when the abandoned switch is off", () => {
    const keep = filters(state({ abandoned: false }));

    expect(keep(show({ status: "Abandoned" }))).toBe(false);
    expect(keep(show({ status: "Ended" }))).toBe(true);
  });

  it("drops anime when the anime switch is off", () => {
    const keep = filters(state({ anime: false }));

    expect(keep(show({ type: "anime" }))).toBe(false);
    expect(keep(show({ type: "show" }))).toBe(true);
  });
});

describe("categories", () => {
  it("matches the primary genre only, so the filter and the charts agree about what a genre holds", () => {
    const keep = filters(state({ genre: ["Drama"] }));

    expect(keep(show({ genre: "Drama" }))).toBe(true);
    // "Drama" sits in this show's secondary list; the charts attribute it to Sci-Fi, so the
    // filter must too.
    expect(keep(show({ genre: "Sci-Fi", genres: ["Drama"] }))).toBe(false);
  });

  it("filters by network, type and franchise as inclusion lists", () => {
    expect(filters(state({ network: ["HBO"] }))(show({ network: "Netflix" }))).toBe(false);
    expect(filters(state({ type: ["anime"] }))(show({ type: "anime" }))).toBe(true);
    expect(filters(state({ franchise: ["Star Trek"] }))(show({ franchise: "Star Trek" }))).toBe(true);
    expect(filters(state({ franchise: ["Star Trek"] }))(show())).toBe(false);
  });
});

describe("guest mode", () => {
  it("hides anime, which is what guest mode means on this tab", () => {
    // The same flag hides adult-themed games on the games tab — same switch, different rule.
    const keep = filters(state({ guestMode: true }));

    expect(keep(show({ type: "anime" }))).toBe(false);
    expect(keep(show({ type: "show" }))).toBe(true);
  });

  it("cannot be re-enabled from the anime toggle, because it composes on top", () => {
    const keep = filters(state({ guestMode: true, anime: true }));

    expect(keep(show({ type: "anime" }))).toBe(false);
  });
});

describe("the year cutoff", () => {
  it("asks whether a season started in the year, not whether the show began then", () => {
    // The shared predicate reads `startDate.year`, a show's *first* season — which would keep
    // only shows that began in the year while the vitals card beside the control counts seasons
    // started in it. A show that began earlier but had a season that year must stay.
    const keep = filters(state({ yearType: "matching", yearTo: 2022 as YearNumber }));

    expect(keep(showWithSeasonsIn(2022))).toBe(true);
    expect(keep(showWithSeasonsIn(2019, 2022))).toBe(true);
    expect(keep(showWithSeasonsIn(2019, 2021))).toBe(false);
  });

  it("applies an earlier ceiling to seasons the same way", () => {
    const ceiling = (CURRENT_YEAR - 1) as YearNumber;
    const keep = filters(state({ yearType: "upto", yearTo: ceiling }));

    expect(keep(showWithSeasonsIn(ceiling))).toBe(true);
    expect(keep(showWithSeasonsIn(CURRENT_YEAR))).toBe(false);
  });

  it("is a no-op at the current year, the ceiling that means no ceiling", () => {
    const keep = filters(state({ yearType: "upto", yearTo: CURRENT_YEAR }));

    expect(keep(showWithSeasonsIn(CURRENT_YEAR))).toBe(true);
  });
});
