import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, type YearNumber } from "../../src/common/date";
import { guestFilter, showFilters } from "../../src/show/filters";
import { filters, initialState, type FilterState } from "../../src/show/filterUtils";
import { show, showWithSeasonsIn } from "../fixtures/shows";

const state = (overrides: Partial<FilterState> = {}): Omit<FilterState, "filter"> => ({
  ...initialState,
  ...overrides,
});

describe("the default state", () => {
  it("is a no-op: every toggle is permissive, the year ceiling is the current year, guest mode is off", () => {
    const keep = filters(state());

    expect(keep(show({ style: "Anime" }))).toBe(true);
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
});

describe("categories", () => {
  it("holds the page to any set of styles, or to none", () => {
    expect(filters(state({ style: [] }))(show({ style: "Anime" }))).toBe(true);
    expect(filters(state({ style: [] }))(show({ style: "Stylised" }))).toBe(true);

    expect(filters(state({ style: ["Anime"] }))(show({ style: "Anime" }))).toBe(true);
    expect(filters(state({ style: ["Anime"] }))(show({ style: "Realistic" }))).toBe(false);

    expect(filters(state({ style: ["Realistic", "Stylised"] }))(show({ style: "Anime" }))).toBe(false);
    expect(filters(state({ style: ["Realistic", "Stylised"] }))(show({ style: "Stylised" }))).toBe(true);
  });

  it("offers the shared vocabulary in its own order, and only the words the rows carry", () => {
    const style = showFilters.categories.find((category) => category.key === "style")!;

    expect(style.options!([show({ style: "Stylised" }), show({ style: "Anime" }), show()])).toEqual([
      "Anime",
      "Realistic",
      "Stylised",
    ]);
    expect(style.options!([show({ style: "Stylised" })])).toEqual(["Stylised"]);
  });

  it("puts every style in the box's index", () => {
    // Each of the three is something a reader looks for across the library.
    const style = showFilters.categories.find((category) => category.key === "style")!;

    expect(style.found).toBeUndefined();
  });

  it("matches the primary genre only, so the filter and the charts agree about what a genre holds", () => {
    const keep = filters(state({ genre: ["Drama"] }));

    expect(keep(show({ genre: "Drama" }))).toBe(true);
    // "Drama" sits in this show's secondary list; the charts attribute it to Sci-Fi, so the
    // filter must too.
    expect(keep(show({ genre: "Sci-Fi", otherGenres: ["Drama"] }))).toBe(false);
  });

  it("filters by network, certificate and franchise as inclusion lists", () => {
    expect(filters(state({ network: ["HBO"] }))(show({ network: "Netflix" }))).toBe(false);
    expect(filters(state({ certificate: ["15"] }))(show({ certificate: "15" }))).toBe(true);
    expect(filters(state({ certificate: ["15"] }))(show({ certificate: "18" }))).toBe(false);
    expect(filters(state({ franchise: ["Star Trek"] }))(show({ franchise: "Star Trek" }))).toBe(true);
    expect(filters(state({ franchise: ["Star Trek"] }))(show())).toBe(false);
  });
});

describe("what guest mode hides", () => {
  // Applied to the library above the tab, so it is exercised as the predicate itself; the style
  // select reads the same field, one reading serving both.
  it("keeps everything but anime, which is what the mode means on this tab", () => {
    expect(guestFilter(show({ style: "Anime" }))).toBe(false);
    expect(guestFilter(show({ style: "Realistic" }))).toBe(true);
    expect(guestFilter(show({ style: "Stylised" }))).toBe(true);
  });

  it("cannot be undone by the style select, which narrows the library rather than widening it", () => {
    // Asking for anime alone admits it back into the charts; in guest mode there is none in the
    // library for it to admit.
    expect(filters(state({ style: ["Anime"] }))(show({ style: "Anime" }))).toBe(true);
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

describe("the schema the drawer and the box are both drawn from", () => {
  it("offers one toggle and five categories, in the order they are laid out", () => {
    // The one toggle names a pile to be rid of; style is a category, a switch holding two of its
    // readings at most.
    expect(showFilters.toggles.map((toggle) => toggle.key)).toEqual(["abandoned"]);
    expect(showFilters.categories.map((category) => category.key)).toEqual([
      "genre",
      "network",
      "style",
      "certificate",
      "franchise",
    ]);
  });

  it("opens a search-within on the vocabularies this library holds hundreds of values in", () => {
    // A reader picks a franchise, a person or a network by typing; a genre or a format by scanning
    // a list short enough to read. The flag is what tells the two apart, and the search box's This
    // page mode reads it, offering a long category as a list to search rather than one to scan.
    // The column gains a streamer whenever one launches, and stands at 77 against genre's 10.
    expect(showFilters.categories.filter((category) => category.searchable).map((category) => category.key)).toEqual([
      "network",
      "franchise",
    ]);
  });
});
