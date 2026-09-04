import { describe, expect, it } from "vitest";
import { BOOK_SECTIONS, bookSections } from "../../src/books/sections";

describe("the Books sections", () => {
  it("run in the page's own order, prefixed so no two tabs share an anchor", () => {
    expect(Object.values(BOOK_SECTIONS)).toEqual([
      "books-now",
      "books-vitals",
      "books-top",
      "books-explore",
      "books-timeline",
      "books-charts",
      "books-library",
    ]);
  });

  it("offer the Now chip only while a book is being read", () => {
    expect(bookSections(true, false).map((chip) => chip.id)).toContain("books-now");
    expect(bookSections(false, false).map((chip) => chip.id)).not.toContain("books-now");
    expect(bookSections(false, false)).toHaveLength(6);
  });
});
