import { describe, expect, it } from "vitest";
import { formatToColour, groupToColour, isFormat, isStatus } from "../../src/books/types";
import { genreToColour, neutralFill, scoreBandToColour, statusToColour } from "../../src/utils/types";
import { book } from "../fixtures/books";

describe("the vocabularies", () => {
  it("recognise exactly the words the sheet is allowed to write", () => {
    expect(isStatus("Reading")).toBe(true);
    expect(isStatus("Finished")).toBe(true);
    expect(isStatus("Beat")).toBe(false);
    expect(isFormat("eBook")).toBe(true);
    expect(isFormat("Kindle")).toBe(false);
  });

  it("colour every format, and answer the neutral off the table", () => {
    expect(formatToColour("eBook", "light")).toBe("#4898e6");
    expect(formatToColour("Physical", "dark")).toBe("#f28c5c");
    expect(formatToColour("Scroll", "light")).toBe(neutralFill("light"));
  });
});

describe("groupToColour", () => {
  it("routes each grouping to the vocabulary the rest of the app paints it with", () => {
    const subject = book({ genre: "Fantasy", score: 9, status: "Reading", format: "Audiobook" });

    expect(groupToColour("genre", subject, "light")).toBe(genreToColour("Fantasy", "light"));
    expect(groupToColour("score", subject, "light")).toBe(scoreBandToColour("9–10", "light"));
    expect(groupToColour("status", subject, "light")).toBe(statusToColour({ status: "Reading" }, "light"));
    expect(groupToColour("format", subject, "light")).toBe(formatToColour("Audiobook", "light"));
  });

  it("hands an author, a series and a title to the chart's own palette", () => {
    expect(groupToColour("author", book(), "light")).toBe("");
    expect(groupToColour("series", book(), "light")).toBe("");
    expect(groupToColour("name", book(), "light")).toBe("");
  });
});
