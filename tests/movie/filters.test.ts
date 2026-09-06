import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { guestFilter, movieFilters } from "../../src/movie/filters";
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
  it("keeps only scored films when the unscored switch is off", () => {
    const keep = filters(state({ unscored: false }));

    expect(keep(movie({ score: 8 }))).toBe(true);
    expect(keep(movie({ score: undefined }))).toBe(false);
  });
});

describe("categories", () => {
  it("holds the page to either side of a split, or to neither", () => {
    // Both splits, and both directions of each: the two readings a switch could not reach are
    // "only anime" and "only the nights in".
    expect(filters(state({ anime: ["Anime"] }))(movie({ anime: true }))).toBe(true);
    expect(filters(state({ anime: ["Anime"] }))(movie({ anime: false }))).toBe(false);
    expect(filters(state({ anime: ["Film"] }))(movie({ anime: true }))).toBe(false);

    expect(filters(state({ cinema: ["Cinema"] }))(movie({ cinema: true }))).toBe(true);
    expect(filters(state({ cinema: ["Cinema"] }))(movie({ cinema: false }))).toBe(false);
    expect(filters(state({ cinema: ["Home"] }))(movie({ cinema: true }))).toBe(false);
    expect(filters(state({ cinema: ["Home"] }))(movie({ cinema: false }))).toBe(true);

    expect(filters(state({ cinema: [] }))(movie({ cinema: false }))).toBe(true);
  });

  it("puts both halves of the outing split in the box's index, where anime keeps only its own", () => {
    // An outing and a night in are each a thing to go looking for, where "Film" on the Movies tab
    // names the tab.
    const cinema = movieFilters.categories.find((category) => category.key === "cinema")!;
    const anime = movieFilters.categories.find((category) => category.key === "anime")!;

    expect(cinema.found).toBeUndefined();
    expect(cinema.options!([movie({ cinema: true }), movie({ cinema: false })])).toEqual(["Cinema", "Home"]);
    expect(anime.found).toEqual(["Anime"]);
  });

  it("filters by genre, director, franchise and certificate as inclusion lists", () => {
    expect(filters(state({ genre: ["Horror"] }))(movie({ genre: "Sci-Fi" }))).toBe(false);
    expect(filters(state({ genre: ["Horror"] }))(movie({ genre: "Horror" }))).toBe(true);

    expect(filters(state({ director: ["Denis Villeneuve"] }))(movie({ director: "Denis Villeneuve" }))).toBe(true);
    expect(filters(state({ director: ["Denis Villeneuve"] }))(movie({ director: "Someone Else" }))).toBe(false);

    expect(filters(state({ franchise: ["Alien"] }))(movie({ franchise: "Alien" }))).toBe(true);
    expect(filters(state({ franchise: ["Alien"] }))(movie({ franchise: "Arrival" }))).toBe(false);

    expect(filters(state({ certificate: ["15"] }))(movie({ certificate: "15" }))).toBe(true);
    expect(filters(state({ certificate: ["15"] }))(movie({ certificate: "12" }))).toBe(false);
  });
});

describe("what guest mode hides", () => {
  // Applied to the library above the tab, so it is exercised as the predicate itself; the anime
  // toggle below drops the same films, one rule serving both.
  it("keeps everything but a film the sheet marks as anime", () => {
    expect(guestFilter(movie({ anime: true }))).toBe(false);
    expect(guestFilter(movie({ anime: false }))).toBe(true);
  });

  it("cannot be undone by the anime select, which narrows the library rather than widening it", () => {
    expect(filters(state({ anime: ["Anime"] }))(movie({ anime: true }))).toBe(true);
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

describe("the schema the drawer and the box are both drawn from", () => {
  it("offers one toggle and six categories, in the order they are laid out", () => {
    // Unscored films are a pile to be rid of; both splits are categories, each having a third
    // reading a switch cannot hold.
    expect(movieFilters.toggles.map((toggle) => toggle.key)).toEqual(["unscored"]);
    expect(movieFilters.categories.map((category) => category.key)).toEqual([
      "genre",
      "anime",
      "cinema",
      "certificate",
      "director",
      "franchise",
    ]);
  });

  it("opens a search-within on the vocabularies this library holds hundreds of values in", () => {
    // A reader picks a franchise or a person by typing; a genre or a format by scanning a list
    // short enough to read. The flag is what tells the two apart, and the search box's This page
    // mode reads it, offering a long category as a list to search rather than one to scan.
    expect(movieFilters.categories.filter((category) => category.searchable).map((category) => category.key)).toEqual([
      "director",
      "franchise",
    ]);
  });
});
