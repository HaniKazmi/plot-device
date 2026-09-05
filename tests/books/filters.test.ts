import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { filters, initialState, reducer, type FilterState } from "../../src/books/filterUtils";
import { book } from "../fixtures/books";
import { bookFilters } from "../../src/books/filters";

const state = (overrides: Partial<Omit<FilterState, "filter">> = {}) => ({ ...initialState, ...overrides });

describe("the default state", () => {
  it("keeps every book", () => {
    const keep = filters(state());

    expect(keep(book())).toBe(true);
    expect(keep(book({ score: undefined }))).toBe(true);
    expect(keep(book({ status: "Reading", endDate: undefined, numDays: undefined }))).toBe(true);
  });

  it("opens on the Books measure, with the cutoff at the current year", () => {
    expect(initialState.measure).toBe("Books");
    expect(initialState.yearTo).toBe(CURRENT_YEAR);
    expect(initialState.yearType).toBe("upto");
  });
});

describe("toggles and categories", () => {
  it("drops unscored books when the unscored switch is off", () => {
    const keep = filters(state({ unscored: false }));

    expect(keep(book({ score: 7 }))).toBe(true);
    expect(keep(book({ score: undefined }))).toBe(false);
  });

  it.each([
    ["genre", "Fantasy", { genre: "Fantasy" }, { genre: "Sci-Fi" }],
    ["author", "Robin Hobb", { author: "Robin Hobb" }, { author: "Iain M. Banks" }],
    ["franchise", "Cosmere", { franchise: "Cosmere" }, { franchise: "The Culture" }],
    ["series", "Mistborn", { series: "Mistborn" }, { series: "" }],
    ["format", "Audiobook", { format: "Audiobook" as const }, { format: "eBook" as const }],
  ] as const)("narrows to the selected %s", (field, selected, kept, dropped) => {
    const keep = filters(state({ [field]: [selected] }));

    expect(keep(book(kept))).toBe(true);
    expect(keep(book(dropped))).toBe(false);
  });

  it("reads the year a book was begun, not the year it was finished", () => {
    // The same field the vitals card and the timeline place a book by.
    const straddling = book({
      startDate: YearMonthDay.get(CURRENT_YEAR - 2, 12, 20),
      endDate: YearMonthDay.get(CURRENT_YEAR - 1, 1, 8),
    });

    const year = (offset: number) => (CURRENT_YEAR - offset) as YearNumber;

    expect(filters(state({ yearType: "matching", yearTo: year(2) }))(straddling)).toBe(true);
    expect(filters(state({ yearType: "matching", yearTo: year(1) }))(straddling)).toBe(false);
    expect(filters(state({ yearTo: year(3) }))(straddling)).toBe(false);
  });
});

describe("the measure", () => {
  it("reaches all three of this domain's measures, which no other domain has", () => {
    // Pages is the third measure in the app, and the control that sets it is a segment per
    // measure rather than a cycle — every one is reachable in one press from any other.
    const pages = reducer(initialState, { type: "measure", measure: "Pages" });
    const hours = reducer(pages, { type: "measure", measure: "Hours" });

    expect([initialState.measure, pages.measure, hours.measure]).toEqual(["Books", "Pages", "Hours"]);
  });
});

describe("the schema the drawer and the box are both drawn from", () => {
  it("offers one toggle and five categories, in the order they are laid out", () => {
    expect(bookFilters.toggles.map((toggle) => toggle.key)).toEqual(["unscored"]);
    expect(bookFilters.categories.map((category) => category.key)).toEqual([
      "genre",
      "format",
      "author",
      "series",
      "franchise",
    ]);
  });

  it("opens a search-within on the vocabularies this library holds hundreds of values in", () => {
    // A reader picks a franchise or a person by typing; a genre or a format by scanning a list
    // short enough to read. The flag is what tells the two apart, and B8's box reads it.
    expect(bookFilters.categories.filter((category) => category.searchable).map((category) => category.key)).toEqual([
      "author",
      "franchise",
    ]);
  });
});
