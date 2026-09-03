import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { bookSubtitle, readRange, seriesLabel } from "../../src/books/cardData";
import { genreToColour } from "../../src/utils/types";
import { book } from "../fixtures/books";

describe("bookSubtitle", () => {
  it("names the author plainly and the genre with the ramp's own swatch", () => {
    expect(bookSubtitle(book(), "dark")).toEqual([
      { text: "Alastair Reynolds" },
      { text: "Sci-Fi", swatch: genreToColour("Sci-Fi", "dark") },
    ]);
  });
});

describe("seriesLabel", () => {
  it("states the place and the series, the series alone when unnumbered, and nothing for a standalone", () => {
    expect(seriesLabel(book())).toBe("#2 · Revelation Space");
    expect(seriesLabel(book({ seriesNumber: undefined }))).toBe("Revelation Space");
    expect(seriesLabel(book({ series: "", seriesNumber: undefined }))).toBe("");
  });
});

describe("readRange", () => {
  it("runs from the start to the end, and to the present while the book is open", () => {
    expect(readRange(book())).toBe("15 Mar – 27 Mar 2026");
    expect(readRange(book({ startDate: YearMonthDay.get(2026, 5, 1), endDate: undefined }))).toBe(
      "1 May 2026 – present",
    );
  });
});
