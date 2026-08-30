import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { filters, initialState, type FilterState } from "../../src/movie/filterUtils";
import { movie } from "../fixtures/movies";

const state = (overrides: Partial<FilterState> = {}): Omit<FilterState, "filter"> => ({
  ...initialState,
  ...overrides,
});

describe("the default state", () => {
  it("is a no-op: every toggle is permissive, the year ceiling is the current year, guest mode is off", () => {
    const keep = filters(state());

    expect(keep(movie({ cinema: false }))).toBe(true);
    expect(keep(movie({ score: undefined }))).toBe(true);
    expect(keep(movie({ anime: true }))).toBe(true);
  });
});

describe("toggles", () => {
  it("keeps only cinema films when the home switch is off", () => {
    const keep = filters(state({ home: false }));

    expect(keep(movie({ cinema: true }))).toBe(true);
    expect(keep(movie({ cinema: false }))).toBe(false);
  });

  it("keeps only scored films when the unscored switch is off", () => {
    const keep = filters(state({ unscored: false }));

    expect(keep(movie({ score: 8 }))).toBe(true);
    expect(keep(movie({ score: undefined }))).toBe(false);
  });

  it("drops anime when the anime switch is off", () => {
    const keep = filters(state({ anime: false }));

    expect(keep(movie({ anime: true }))).toBe(false);
    expect(keep(movie({ anime: false }))).toBe(true);
  });
});

describe("categories", () => {
  it("filters by genre, director, franchise and rating as inclusion lists", () => {
    expect(filters(state({ genre: ["Horror"] }))(movie({ genre: "Sci-Fi" }))).toBe(false);
    expect(filters(state({ genre: ["Horror"] }))(movie({ genre: "Horror" }))).toBe(true);

    expect(filters(state({ director: ["Denis Villeneuve"] }))(movie({ director: "Denis Villeneuve" }))).toBe(true);
    expect(filters(state({ director: ["Denis Villeneuve"] }))(movie({ director: "Someone Else" }))).toBe(false);

    expect(filters(state({ franchise: ["Alien"] }))(movie({ franchise: "Alien" }))).toBe(true);
    expect(filters(state({ franchise: ["Alien"] }))(movie({ franchise: "Arrival" }))).toBe(false);

    expect(filters(state({ rating: ["15"] }))(movie({ rating: "15" }))).toBe(true);
    expect(filters(state({ rating: ["15"] }))(movie({ rating: "12" }))).toBe(false);
  });
});

describe("guest mode", () => {
  it("hides anime, the same switch as the anime toggle but composed rather than shared", () => {
    const keep = filters(state({ guestMode: true }));

    expect(keep(movie({ anime: true }))).toBe(false);
    expect(keep(movie({ anime: false }))).toBe(true);
  });

  it("cannot be re-enabled from the anime toggle, because it composes on top", () => {
    const keep = filters(state({ guestMode: true, anime: true }));

    expect(keep(movie({ anime: true }))).toBe(false);
  });
});

describe("the year cutoff", () => {
  it("matches the watch year exactly under 'matching'", () => {
    const keep = filters(state({ yearType: "matching", yearTo: 2022 as YearNumber }));

    expect(keep(movie({ startDate: YearMonthDay.get(2022, 6, 1) }))).toBe(true);
    expect(keep(movie({ startDate: YearMonthDay.get(2021, 6, 1) }))).toBe(false);
  });

  it("applies an earlier ceiling to the watch year under 'upto'", () => {
    const ceiling = (CURRENT_YEAR - 1) as YearNumber;
    const keep = filters(state({ yearType: "upto", yearTo: ceiling }));

    expect(keep(movie({ startDate: YearMonthDay.get(ceiling, 6, 1) }))).toBe(true);
    expect(keep(movie({ startDate: YearMonthDay.get(CURRENT_YEAR, 6, 1) }))).toBe(false);
  });

  it("is a no-op at the current year, the ceiling that means no ceiling", () => {
    const keep = filters(state({ yearType: "upto", yearTo: CURRENT_YEAR }));

    expect(keep(movie({ startDate: YearMonthDay.get(CURRENT_YEAR, 6, 1) }))).toBe(true);
  });
});
