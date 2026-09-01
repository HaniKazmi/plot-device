import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { jsonConverter } from "../../src/movie/converter";
import { movieRow } from "../fixtures/movieRows";

const convertOne = (overrides: Record<string, string> = {}) => jsonConverter([movieRow(overrides)])[0];

describe("bad rows", () => {
  it("rejects an empty genre naming the row, rather than dropping it", () => {
    // No sheet leaves the column blank, so a blank is a row nobody finished. Dropping it silently
    // is what leaves a film missing from every total with nothing on screen to say which one.
    expect(() => jsonConverter([movieRow({ Name: "Draft", Genre: "" })])).toThrow(
      'Row 2, "Draft", Genre: no genre recorded',
    );
  });

  it("rejects a row the sheet truncated before the Genre column", () => {
    // The API ends a row at its last filled cell, so a half-entered row carries no `Genre` key at
    // all. Testing the cell against "" answers `true` for that row and lets it through.
    expect(() => jsonConverter([{ Name: "Half", "Watch Date": "2024-01-01" }])).toThrow(
      'Row 2, "Half", Genre: no genre recorded',
    );
  });

  it("throws on a blank date rather than carrying an unparseable one", () => {
    expect(() => convertOne({ "Watch Date": "" })).toThrow("Unkown Date Format");
    expect(() => convertOne({ "Release Date": "" })).toThrow("Unkown Date Format");
  });

  it("names the sheet row, the film and the column that failed", () => {
    expect(() => convertOne({ Name: "Arrival", "Watch Date": "" })).toThrow('Row 2, "Arrival", Watch Date');
  });

  it("numbers a row as the sheet does, counting the header", () => {
    const rows = [movieRow({ Name: "Fine" }), movieRow({ Name: "Broken", "Watch Date": "" })];

    expect(() => jsonConverter(rows)).toThrow('Row 3, "Broken"');
  });
});

describe("field parsing", () => {
  it("maps the Watch Date column to startDate, the name the shared year filter expects", () => {
    expect(convertOne().startDate).toBe(YearMonthDay.get(2017, 1, 14));
    expect(convertOne().releaseDate).toBe(YearMonthDay.get(2016, 11, 11));
  });

  it("drops a blank score rather than carrying NaN, which any average would spread", () => {
    // A film nobody scored is absent from the column, which is not the same as scoring it zero.
    expect(convertOne({ Score: "" }).score).toBeUndefined();
    expect(convertOne({ Score: "9" }).score).toBe(9);
  });

  it("reads the runtime out of the sheet's own NNNmin form", () => {
    expect(convertOne({ Runtime: "116min" }).minutes).toBe(116);
  });

  it("reads a blank runtime as zero rather than NaN, which any sum would spread", () => {
    // `sum` accumulates with `+`, so one NaN blanks every hours total and average far from the
    // row that carried it. Unlike score, minutes is not optional on the model, so 0 is the
    // value that keeps sums honest.
    expect(convertOne({ Runtime: "" }).minutes).toBe(0);
  });

  it("rejects a rating the colour map could not paint, naming the row and the film", () => {
    // Left to reach ageRatingToColour, a bad cell throws from inside a render instead — naming
    // the value but not which film carried it.
    expect(() => convertOne({ Rating: "" })).toThrow('Row 2, "Arrival", Rating: "" is not an age rating');
    expect(() => convertOne({ Rating: "PG-13" })).toThrow("not an age rating");
  });

  it("accepts the BBFC numbers this sheet records, alongside the PEGI form games use", () => {
    expect(convertOne({ Rating: "3" }).rating).toBe("3");
    expect(convertOne({ Rating: "15" }).rating).toBe("15");
  });

  it("splits the secondary genres on the comma the sheet separates them with", () => {
    expect(convertOne({ Genres: "Drama, Mystery" }).genres).toEqual(["Drama", "Mystery"]);
    // Written both ways in the sheet, so the space cannot be part of the separator.
    expect(convertOne({ Genres: "Drama,Mystery" }).genres).toEqual(["Drama", "Mystery"]);
  });

  it("gives a film with no secondary genres an empty list, not a list holding an empty string", () => {
    // Every reader counts or renders this list directly, and [""] shows up as a blank entry and
    // as a genre of its own in any tally.
    expect(convertOne({ Genres: "" }).genres).toEqual([]);
  });

  it("reads the cinema flag only from the literal string TRUE", () => {
    // The sheet writes nothing at all for the false case, so anything else is false rather than
    // an error — including the lower-case spelling, which the sheet never produces.
    expect(convertOne({ Cinema: "TRUE" }).cinema).toBe(true);
    expect(convertOne({ Cinema: "" }).cinema).toBe(false);
    expect(convertOne({ Cinema: "true" }).cinema).toBe(false);
  });

  it("reads the anime flag the same way as cinema: TRUE or blank, nothing else", () => {
    expect(convertOne({ Anime: "TRUE" }).anime).toBe(true);
    expect(convertOne({ Anime: "" }).anime).toBe(false);
  });

  it("carries the remaining columns through untouched", () => {
    const movie = convertOne();

    expect(movie.name).toBe("Arrival");
    expect(movie.genre).toBe("Sci-Fi");
    expect(movie.franchise).toBe("Arrival");
    expect(movie.director).toBe("Denis Villeneuve");
    expect(movie.banner).toBe("arrival.jpg");
  });
});
