import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { movieDataConfig, jsonConverter } from "../../src/movie/converter";
import { movieRow } from "../fixtures/movieRows";

const convertOne = (overrides: Record<string, string> = {}) => jsonConverter([movieRow(overrides)])[0];

describe("bad rows", () => {
  it("rejects an empty genre naming the row, rather than dropping it", () => {
    // No sheet leaves the column blank, so a blank is a row nobody finished. Dropping it silently
    // is what leaves a film missing from every total with nothing on screen to say which one.
    expect(() => jsonConverter([movieRow({ Title: "Draft", Genre: "" })])).toThrow(
      'Row 2, "Draft", Genre: no genre recorded',
    );
  });

  it("rejects a row the sheet truncated before the Genre column", () => {
    // The API ends a row at its last filled cell, so a half-entered row carries no `Genre` key at
    // all. Testing the cell against "" answers `true` for that row and lets it through.
    expect(() => jsonConverter([{ Title: "Half", "Watch Date": "2024-01-01" }])).toThrow(
      'Row 2, "Half", Genre: no genre recorded',
    );
  });

  it("throws on a blank date rather than carrying an unparseable one", () => {
    expect(() => convertOne({ "Watch Date": "" })).toThrow("Unkown Date Format");
    expect(() => convertOne({ "Release Date": "" })).toThrow("Unkown Date Format");
  });

  it("rejects a Watch Date recorded as a bare year, naming the row that carries it", () => {
    // The model types the watch date as a full one and every time axis places it on a day. A
    // four-character cell parses to a `Year` and passes the cast, then disappears from the ribbon
    // or lands there as an offset of NaN — neither of which names the row to go and fix.
    expect(() => convertOne({ Title: "Alien", "Watch Date": "1979" })).toThrow(
      'Row 2, "Alien", Watch Date: "1979" is a bare year, not a full date',
    );
  });

  it("rejects a Release Date recorded as a bare year, on the same rule as the watch date", () => {
    // The model types the release date as a full one too, and the literal below is cast to `Movie`
    // — so a `Year` would land in a `YearMonthDay` field with nothing to catch it, and surface as
    // a mark placed at NaN on whichever chart reached it first.
    expect(() => convertOne({ Title: "Alien", "Release Date": "1979" })).toThrow(
      'Row 2, "Alien", Release Date: "1979" is a bare year, not a full date',
    );
  });

  it("reads the series and its number, blank until the columns are filled in", () => {
    // Both columns are empty on every row today, so this pins that they arrive as the absence the
    // model declares rather than as `undefined` in a field typed `string`.
    expect(convertOne().series).toBe("");
    expect(convertOne().seriesNumber).toBeUndefined();
    expect(convertOne({ Series: "Arrival", "Series #": "1" }).seriesNumber).toBe(1);
  });

  it("names the sheet row, the film and the column that failed", () => {
    expect(() => convertOne({ Title: "Arrival", "Watch Date": "" })).toThrow('Row 2, "Arrival", Watch Date');
  });

  it("numbers a row as the sheet does, counting the header", () => {
    const rows = [movieRow({ Title: "Fine" }), movieRow({ Title: "Broken", "Watch Date": "" })];

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
    expect(convertOne({ "Runtime (min)": "116" }).minutes).toBe(116);
  });

  it("reads a blank runtime as zero rather than NaN, which any sum would spread", () => {
    // `sum` accumulates with `+`, so one NaN blanks every hours total and average far from the
    // row that carried it. Unlike score, minutes is not optional on the model, so 0 is the
    // value that keeps sums honest.
    expect(convertOne({ "Runtime (min)": "" }).minutes).toBe(0);
  });

  it("rejects a certificate the colour map could not paint, naming the row and the film", () => {
    // Left to reach certificateToColour, a bad cell throws from inside a render instead — naming
    // the value but not which film carried it.
    expect(() => convertOne({ Certificate: "" })).toThrow('Row 2, "Arrival", Certificate: "" is not a certificate');
    expect(() => convertOne({ Certificate: "PG-13" })).toThrow("not a certificate");
  });

  it("accepts the BBFC numbers this sheet records, alongside the PEGI form games use", () => {
    expect(convertOne({ Certificate: "3" }).certificate).toBe("3");
    expect(convertOne({ Certificate: "15" }).certificate).toBe("15");
  });

  it("splits the secondary genres on the comma the sheet separates them with", () => {
    expect(convertOne({ "Other Genres": "Drama, Mystery" }).otherGenres).toEqual(["Drama", "Mystery"]);
    // Written both ways in the sheet, so the space cannot be part of the separator.
    expect(convertOne({ "Other Genres": "Drama,Mystery" }).otherGenres).toEqual(["Drama", "Mystery"]);
  });

  it("gives a film with no secondary genres an empty list, not a list holding an empty string", () => {
    // Every reader counts or renders this list directly, and [""] shows up as a blank entry and
    // as a genre of its own in any tally.
    expect(convertOne({ "Other Genres": "" }).otherGenres).toEqual([]);
  });

  it("reads the cinema flag only from the literal string TRUE", () => {
    // The sheet writes nothing at all for the false case, so anything else is false rather than
    // an error — including the lower-case spelling, which the sheet never produces.
    expect(convertOne({ Format: "Cinema" }).cinema).toBe(true);
    expect(convertOne({ Format: "Home" }).cinema).toBe(false);
  });

  it("rejects a watch format outside the sheet's two words rather than reading it as Home", () => {
    // The column was a flag written only in its true case, where a blank was the false case and
    // there was nothing to reject. A worded column has no blank case, so a value outside the pair
    // — or a header named wrongly here, which is every row at once — would be a library that
    // silently claims no film was ever seen in a cinema.
    expect(() => convertOne({ Format: "" })).toThrow('Row 2, "Arrival", Format: "" is neither Cinema nor Home');
    expect(() => convertOne({ Format: "cinema" })).toThrow("is neither Cinema nor Home");
  });

  it("reads the anime flag the same way as cinema: TRUE or blank, nothing else", () => {
    expect(convertOne({ Type: "anime" }).anime).toBe(true);
    expect(convertOne({ Type: "film" }).anime).toBe(false);
  });

  it("rejects a film type outside the sheet's two words, guest mode depending on it", () => {
    // The one cell here whose misreading costs more than a wrong figure: guest mode hides anime,
    // so a value that fails to say so puts a hidden film on screen.
    expect(() => convertOne({ Type: "" })).toThrow('Row 2, "Arrival", Type: "" is neither film nor anime');
    expect(() => convertOne({ Type: "Anime" })).toThrow("is neither film nor anime");
  });

  it("carries the remaining columns through untouched", () => {
    const movie = convertOne();

    expect(movie.name).toBe("Arrival");
    expect(movie.genre).toBe("Sci-Fi");
    expect(movie.franchise).toBe("Arrival");
    expect(movie.director).toBe("Denis Villeneuve");
    expect(movie.artwork).toBe("arrival.jpg");
  });
});

describe("the cache config", () => {
  it("keys the cache on the domain and a version, so a shape change can bump it", () => {
    expect(movieDataConfig.storageKey).toBe("movie-data-cache-v4");
    expect(movieDataConfig.converter).toBe(jsonConverter);
  });
});
