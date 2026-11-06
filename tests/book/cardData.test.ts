import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { bookCredit, bookSubtitle, readRange } from "../../src/book/cardData";
import { formatToColour, genreToColour } from "../../src/utils/types";
import { book } from "../fixtures/books";

describe("bookSubtitle", () => {
  it("names the format with its band's swatch, the author plainly, and the genre with the ramp's own", () => {
    expect(bookSubtitle(book(), "dark")).toEqual([
      { text: "eBook", swatch: formatToColour("eBook", "dark") },
      { text: "Alastair Reynolds" },
      { text: "Sci-Fi", swatch: genreToColour("Sci-Fi", "dark") },
    ]);
  });
});

describe("bookCredit", () => {
  it("is the subtitle less its format, for the Now card that names a book by its author", () => {
    expect(bookCredit(book(), "dark")).toEqual(bookSubtitle(book(), "dark").slice(1));
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
