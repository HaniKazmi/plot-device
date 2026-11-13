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

    expect(keep(movie({ venue: "Home" }))).toBe(true);
    expect(keep(movie({ score: undefined }))).toBe(true);
    expect(keep(movie({ style: "Anime" }))).toBe(true);
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
  it("holds the page to any set of styles, or to any set of venues, or to neither", () => {
    // Every reading of the venue: one outing alone, both outings, and the nights in alone.
    expect(filters(state({ style: ["Anime"] }))(movie({ style: "Anime" }))).toBe(true);
    expect(filters(state({ style: ["Anime"] }))(movie({ style: "Realistic" }))).toBe(false);
    expect(filters(state({ style: ["Realistic", "Stylised"] }))(movie({ style: "Anime" }))).toBe(false);

    expect(filters(state({ venue: ["Theatre"] }))(movie({ venue: "Theatre" }))).toBe(true);
    expect(filters(state({ venue: ["Theatre"] }))(movie({ venue: "Cinema" }))).toBe(false);
    expect(filters(state({ venue: ["Cinema", "Theatre"] }))(movie({ venue: "Cinema" }))).toBe(true);
    expect(filters(state({ venue: ["Cinema", "Theatre"] }))(movie({ venue: "Home" }))).toBe(false);
    expect(filters(state({ venue: ["Home"] }))(movie({ venue: "Home" }))).toBe(true);

    expect(filters(state({ venue: [] }))(movie({ venue: "Theatre" }))).toBe(true);
  });

  it("puts every venue and every style in the box's index", () => {
    // An outing and a night in are each a thing to go looking for, as each of the three styles is.
    const venue = movieFilters.categories.find((category) => category.key === "venue")!;
    const style = movieFilters.categories.find((category) => category.key === "style")!;

    expect(venue.found).toBeUndefined();
    // In the vocabulary's own order whatever order the rows hold them in, and only the ones present.
    expect(venue.options!([movie({ venue: "Home" }), movie({ venue: "Theatre" })])).toEqual(["Theatre", "Home"]);
    expect(style.found).toBeUndefined();
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
  // Applied to the library above the tab, so it is exercised as the predicate itself; the style
  // select reads the same field, one reading serving both.
  it("keeps everything but a film the sheet styles as anime", () => {
    expect(guestFilter(movie({ style: "Anime" }))).toBe(false);
    expect(guestFilter(movie({ style: "Realistic" }))).toBe(true);
    expect(guestFilter(movie({ style: "Stylised" }))).toBe(true);
  });

  it("cannot be undone by the style select, which narrows the library rather than widening it", () => {
    expect(filters(state({ style: ["Anime"] }))(movie({ style: "Anime" }))).toBe(true);
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
    // Unscored films are a pile to be rid of; the style and the venue are categories, a
    // switch holding two of either's readings at most.
    expect(movieFilters.toggles.map((toggle) => toggle.key)).toEqual(["unscored"]);
    expect(movieFilters.categories.map((category) => category.key)).toEqual([
      "genre",
      "style",
      "venue",
      "certificate",
      "director",
      "filmSeries",
      "franchise",
    ]);
  });

  it("opens a search-within on the vocabularies this library holds hundreds of values in", () => {
    // A reader picks a franchise or a person by typing; a genre or a format by scanning a list
    // short enough to read. The flag is what tells the two apart, and the search box's This page
    // mode reads it, offering a long category as a list to search rather than one to scan.
    expect(movieFilters.categories.filter((category) => category.searchable).map((category) => category.key)).toEqual([
      "director",
      "filmSeries",
      "franchise",
    ]);
  });
});
