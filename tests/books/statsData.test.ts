import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay } from "../../src/common/date";
import {
  bookGroupValue,
  bookHeroStats,
  bookKey,
  bookTotals,
  booksInYear,
  currentlyReading,
  daysReading,
  earliestYear,
  groupBooksBy,
  measureOf,
  perBookAverages,
  yearlyAverages,
} from "../../src/books/statsData";
import { book } from "../fixtures/books";

const today = YearMonthDay.get(2026, 9, 2);

describe("measureOf", () => {
  const books = [book({ hours: 12.4, pages: 694 }), book({ hours: 1.5, pages: 299 })];

  it("counts books, floors the hours once over the sum, and sums pages exactly", () => {
    expect(measureOf(books, "Books")).toBe(2);
    // 13.9 floored once, not 12 + 1 floored per book.
    expect(measureOf(books, "Hours")).toBe(13);
    expect(measureOf(books, "Pages")).toBe(993);
  });
});

describe("bookGroupValue", () => {
  it("derives the decade from the release year and the band from the score", () => {
    expect(bookGroupValue(book({ releaseDate: YearMonthDay.get(2016, 9, 20) }), "decade")).toBe("2010s");
    expect(bookGroupValue(book({ score: 9 }), "score")).toBe("9–10");
    expect(bookGroupValue(book({ score: undefined }), "score")).toBe("Unscored");
  });

  it("reads every other key off the book", () => {
    expect(bookGroupValue(book({ author: "N. K. Jemisin" }), "author")).toBe("N. K. Jemisin");
    expect(bookGroupValue(book({ format: "Physical" }), "format")).toBe("Physical");
  });
});

describe("groupBooksBy", () => {
  it("orders groups by the measure, largest first, fronted by the longest read", () => {
    const groups = groupBooksBy(
      [
        book({ name: "A", author: "One", hours: 2 }),
        book({ name: "B", author: "Two", hours: 5 }),
        book({ name: "C", author: "Two", hours: 3 }),
      ],
      "author",
      "Hours",
    );

    expect(groups.map((group) => group.name)).toEqual(["Two", "One"]);
    expect(groups[0].top.name).toBe("B");
  });

  it("drops a franchise of one, which is a book naming itself, but keeps a series of one", () => {
    const standalone = book({ name: "Project Hail Mary", franchise: "Project Hail Mary", series: "Solo" });

    expect(groupBooksBy([standalone], "franchise", "Books")).toEqual([]);
    expect(groupBooksBy([standalone], "series", "Books").map((group) => group.name)).toEqual(["Solo"]);
  });
});

describe("totals and averages", () => {
  const library = [
    book({
      startDate: YearMonthDay.get(2024, 1, 1),
      endDate: YearMonthDay.get(2024, 1, 11),
      numDays: 10,
      pages: 300,
      hours: 6,
    }),
    book({
      startDate: YearMonthDay.get(2024, 6, 1),
      endDate: YearMonthDay.get(2024, 6, 21),
      numDays: 20,
      pages: 500,
      hours: 10.5,
    }),
    book({
      status: "Reading",
      startDate: YearMonthDay.get(2026, 5, 1),
      endDate: undefined,
      numDays: undefined,
      pages: 772,
      hours: 3.6,
    }),
  ];

  it("states books, floored hours and pages over the set it is given", () => {
    expect(bookTotals(library)).toEqual({ books: 3, hours: 20, pages: 1572 });
  });

  it("scopes a year's totals to the books begun in it", () => {
    expect(booksInYear(library, 2024 as typeof CURRENT_YEAR)).toEqual({ books: 2, hours: 16, pages: 800 });
    expect(booksInYear(library, 2025 as typeof CURRENT_YEAR)).toEqual({ books: 0, hours: 0, pages: 0 });
  });

  it("averages over the years anything was begun in, not over the span", () => {
    // 2024 and 2026 are active; 2025 is not counted as a zero.
    expect(yearlyAverages(library)).toEqual({ books: 1.5, hours: 10, pages: 786 });
  });

  it("averages per book over the finished ones only", () => {
    // The open book has no days to average and its hours are still climbing.
    expect(perBookAverages(library)).toEqual({ pages: 400, hours: 8.3, days: 15 });
    expect(perBookAverages([])).toEqual({ pages: 0, hours: 0, days: 0 });
  });
});

describe("what is being read", () => {
  it("lists the books in progress, most recently started first", () => {
    const older = book({
      name: "Older",
      status: "Reading",
      startDate: YearMonthDay.get(2026, 1, 1),
      endDate: undefined,
    });
    const newer = book({
      name: "Newer",
      status: "Reading",
      startDate: YearMonthDay.get(2026, 5, 1),
      endDate: undefined,
    });

    expect(currentlyReading([older, book(), newer]).map((entry) => entry.name)).toEqual(["Newer", "Older"]);
  });

  it("counts days from the sheet once finished and from the start until today while not", () => {
    expect(daysReading(book({ numDays: 12 }), today)).toBe(12);
    // Both ends counted, the way the converter counts a finished read.
    expect(daysReading(book({ endDate: undefined, startDate: YearMonthDay.get(2026, 5, 1) }), today)).toBe(125);
    // A start typed ahead of itself has no day count rather than a negative one.
    expect(daysReading(book({ endDate: undefined, startDate: YearMonthDay.get(2027, 1, 1) }), today)).toBeUndefined();
  });
});

describe("bookHeroStats", () => {
  it("carries the score, hours, days, pages and series place when the sheet holds them", () => {
    expect(bookHeroStats(book(), today, "hero")).toEqual([
      { label: "Score", value: "8/10" },
      { label: "Hours", value: 12.4 },
      { label: "Days", value: 13 },
      { label: "Pages", value: 694 },
      { label: "Revelation Space", value: "#2" },
    ]);
  });

  it("drops every tile the sheet does not hold rather than reading zero", () => {
    const fresh = book({
      status: "Reading",
      score: undefined,
      hours: 0,
      endDate: undefined,
      numDays: undefined,
      startDate: YearMonthDay.get(2026, 9, 1),
      series: "",
      seriesNumber: undefined,
    });

    expect(bookHeroStats(fresh, today, "hero")).toEqual([
      { label: "Days In", value: 2 },
      { label: "Pages", value: 694 },
    ]);
  });

  it("keeps two tiles for a card whose column holds two: the hours or the pages, and the days", () => {
    expect(bookHeroStats(book(), today, "card")).toEqual([
      { label: "Hours", value: 12.4 },
      { label: "Days", value: 13 },
    ]);
    // Pages stand in for hours until any are logged, so the card never opens on one tile.
    expect(bookHeroStats(book({ hours: 0 }), today, "card")).toEqual([
      { label: "Pages", value: 694 },
      { label: "Days", value: 13 },
    ]);
  });
});

describe("keys and floors", () => {
  it("tells a reread from the first read by its start date", () => {
    expect(bookKey(book({ startDate: YearMonthDay.get(2020, 1, 1) }))).not.toBe(
      bookKey(book({ startDate: YearMonthDay.get(2024, 1, 1) })),
    );
  });

  it("reads the earliest start from the data, and falls back to the current year when empty", () => {
    expect(earliestYear([book({ startDate: YearMonthDay.get(2015, 10, 14) }), book()])).toBe(2015);
    expect(earliestYear([])).toBe(CURRENT_YEAR);
  });
});
