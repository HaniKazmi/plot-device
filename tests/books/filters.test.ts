import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { filters, initialState, nextMeasure, reducer, type FilterState } from "../../src/books/filterUtils";
import { book } from "../fixtures/books";

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

  it("adds nothing under guest mode, since nothing on the sheet marks a book to hide", () => {
    expect(filters(state({ guestMode: true }))(book())).toBe(true);
  });
});

describe("the measure", () => {
  it("cycles Books, Hours, Pages and back", () => {
    expect(nextMeasure("Books")).toBe("Hours");
    expect(nextMeasure("Hours")).toBe("Pages");
    expect(nextMeasure("Pages")).toBe("Books");
  });

  it("reaches every measure through the reducer's own toggle", () => {
    const hours = reducer(initialState, { type: "toggleMeasure" });
    const pages = reducer(hours, { type: "toggleMeasure" });
    const books = reducer(pages, { type: "toggleMeasure" });

    expect([hours.measure, pages.measure, books.measure]).toEqual(["Hours", "Pages", "Books"]);
  });
});
