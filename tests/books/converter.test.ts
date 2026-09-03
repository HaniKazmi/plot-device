import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { bookDataConfig, jsonConverter } from "../../src/books/converter";
import { bookRow } from "../fixtures/bookRows";

const convertOne = (overrides: Record<string, string> = {}) => jsonConverter([bookRow(overrides)])[0];

describe("bad rows", () => {
  it("rejects an empty genre naming the row, rather than dropping it", () => {
    expect(() => jsonConverter([bookRow({ "Book Name": "Draft", Genre: "" })])).toThrow(
      'Row 2, "Draft", Genre: no genre recorded',
    );
  });

  it("rejects a row the sheet truncated before the Genre column", () => {
    // The API ends a row at its last filled cell, so a half-entered row carries no `Genre` key at
    // all. Testing the cell against "" answers `true` for that row and lets it through.
    expect(() => jsonConverter([{ "Book Name": "Half", Author: "Someone" }])).toThrow(
      'Row 2, "Half", Genre: no genre recorded',
    );
  });

  it("rejects a status outside the two words the sheet uses, naming the row", () => {
    // `statusToColour` answers `undefined` off its union and the status band then drops the
    // segment without a word, so a typo here has to fail where it still names its row.
    expect(() => convertOne({ Status: "Read" })).toThrow('Row 2, "Chasm City", Status: "Read" is not a status');
    expect(() => convertOne({ Status: "" })).toThrow("is not a status");
  });

  it("rejects a blank or unknown format, since the column is one every row has to answer", () => {
    expect(() => convertOne({ Format: "" })).toThrow('Row 2, "Chasm City", Format: "" is not a format');
    expect(() => convertOne({ Format: "Kindle" })).toThrow('"Kindle" is not a format');
  });

  it("rejects a date recorded as a bare year, naming the row that carries it", () => {
    // The model types every date as a full one and the timeline places each on a day scale.
    expect(() => convertOne({ "Start Date": "2026" })).toThrow(
      'Row 2, "Chasm City", Start Date: "2026" is a bare year, not a full date',
    );
    expect(() => convertOne({ "Release Date": "2001" })).toThrow("Release Date");
  });

  it("throws on a blank start or release date rather than carrying an unparseable one", () => {
    expect(() => convertOne({ "Start Date": "" })).toThrow("Unkown Date Format");
    expect(() => convertOne({ "Release Date": "" })).toThrow("Unkown Date Format");
  });

  it("rejects a finished book with no end date, which would count towards no year", () => {
    expect(() => convertOne({ "End Date": "" })).toThrow(
      'Row 2, "Chasm City", End Date: a finished book has no end date',
    );
  });

  it("rejects a book still being read that carries an end date, which two surfaces would read two ways", () => {
    // The hero would elect it as in hand while Recently Finished listed it as closed on that date.
    expect(() => convertOne({ Status: "Reading" })).toThrow(
      'Row 2, "Chasm City", End Date: a book still being read has an end date',
    );
  });

  it("rejects an end before the start rather than counting negative days", () => {
    expect(() => convertOne({ "Start Date": "2026-03-27", "End Date": "2026-03-15" })).toThrow(
      'Row 2, "Chasm City", End Date',
    );
  });

  it("reads a blank hours cell on a book still being read as none so far", () => {
    // The sheet estimates hours only for finished books, and a book just opened may have no
    // sessions logged; on a finished book the same blank is a cell nobody filled.
    expect(convertOne({ Status: "Reading", "End Date": "", "Hours (est.)": "" }).hours).toBe(0);
    expect(() => convertOne({ "Hours (est.)": "" })).toThrow('Hours (est.): "" is not a number');
  });

  it("rejects a page count or an hours figure that is not a number, since both are measures", () => {
    // A NaN in either column would blank every total taken over it, and a 0 would be a lie in the
    // sum: a book has pages, and the sheet estimates hours for every finished book.
    expect(() => convertOne({ "Number of Pages": "" })).toThrow(
      'Row 2, "Chasm City", Number of Pages: "" is not a number',
    );
    expect(() => convertOne({ "Hours (est.)": "n/a" })).toThrow('Hours (est.): "n/a" is not a number');
  });

  it("numbers a row as the sheet does, counting the header", () => {
    const rows = [bookRow({ "Book Name": "Fine" }), bookRow({ "Book Name": "Broken", "Start Date": "" })];

    expect(() => jsonConverter(rows)).toThrow('Row 3, "Broken"');
  });
});

describe("field parsing", () => {
  it("maps the three date columns onto the model's full dates", () => {
    const book = convertOne();

    expect(book.startDate).toBe(YearMonthDay.get(2026, 3, 15));
    expect(book.endDate).toBe(YearMonthDay.get(2026, 3, 27));
    expect(book.releaseDate).toBe(YearMonthDay.get(2001, 5, 1));
  });

  it("leaves a book in progress without an end date or a day count", () => {
    const book = convertOne({ Status: "Reading", "End Date": "", "Hours (est.)": "3.6" });

    expect(book.status).toBe("Reading");
    expect(book.endDate).toBeUndefined();
    expect(book.numDays).toBeUndefined();
  });

  it("derives the days reading from the date pair, counting both ends", () => {
    // Inclusive, as Games counts: a book begun and finished on one day took a day, where the
    // sheet's own difference column reads 0 for it.
    expect(convertOne().numDays).toBe(13);
    expect(convertOne({ "Start Date": "2026-03-27", "End Date": "2026-03-27" }).numDays).toBe(1);
  });

  it("drops a blank score rather than carrying NaN, which any average would spread", () => {
    expect(convertOne({ Score: "" }).score).toBeUndefined();
    expect(convertOne({ Score: "9" }).score).toBe(9);
  });

  it("reads pages as a whole number and hours as the sheet's decimal estimate", () => {
    const book = convertOne({ "Number of Pages": "340", "Hours (est.)": "6.8" });

    expect(book.pages).toBe(340);
    expect(book.hours).toBe(6.8);
  });

  it("writes a standalone book's own name into franchise, the convention the other sheets follow", () => {
    // Every franchise shell treats a one-member group as an item naming itself, so a blank would be
    // a third convention for the same fact.
    expect(convertOne({ "Book Name": "Project Hail Mary", Franchise: "" }).franchise).toBe("Project Hail Mary");
    expect(convertOne({ Franchise: "Revelation Space" }).franchise).toBe("Revelation Space");
  });

  it("leaves a blank series blank and an unnumbered entry unnumbered", () => {
    const book = convertOne({ Series: "", "# in Series": "" });

    expect(book.series).toBe("");
    expect(book.seriesNumber).toBeUndefined();
    expect(convertOne().seriesNumber).toBe(2);
  });

  it("accepts every format the vocabulary names", () => {
    for (const format of ["eBook", "Audiobook", "Physical"]) {
      expect(convertOne({ Format: format }).format).toBe(format);
    }
  });

  it("carries a missing Banner column as an empty string rather than an absent field", () => {
    // The column is new to the sheet; a row it has not reached yet has no picture to stand on a
    // wall, which is the absence `finishedItems` already handles.
    const row = bookRow();
    delete row.Banner;

    expect(jsonConverter([row])[0].banner).toBe("");
  });

  it("carries the remaining columns through untouched", () => {
    const book = convertOne();

    expect(book.name).toBe("Chasm City");
    expect(book.author).toBe("Alastair Reynolds");
    expect(book.genre).toBe("Sci-Fi");
    expect(book.banner).toBe("https://assets.hardcover.app/external_data/1/chasm-city.jpeg");
  });
});

describe("the cache config", () => {
  it("keys the cache on the domain and a version, so a shape change can bump it", () => {
    expect(bookDataConfig.storageKey).toBe("book-data-cache-v1");
    expect(bookDataConfig.converter).toBe(jsonConverter);
  });
});
