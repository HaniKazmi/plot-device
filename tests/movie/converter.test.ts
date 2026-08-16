import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { jsonConverter } from "../../src/movie/converter";
import { movieRow } from "../fixtures/movieRows";

const convertOne = (overrides: Record<string, string> = {}) => jsonConverter([movieRow(overrides)])[0];

describe("row filtering", () => {
  it("drops rows with an empty Genre, which is how half-entered rows are excluded", () => {
    // Genre stands in for "this row is complete"; it is not a statement about genre.
    const movies = jsonConverter([movieRow({ Name: "Arrival" }), movieRow({ Name: "Draft", Genre: "" })]);

    expect(movies.map((m) => m.name)).toEqual(["Arrival"]);
  });

  it("returns nothing when every row is incomplete", () => {
    expect(jsonConverter([movieRow({ Genre: "" })])).toEqual([]);
  });

  it("does not protect the date parse, so a complete Genre with a blank date still throws", () => {
    expect(() => convertOne({ "Watch Date": "" })).toThrow("Unkown Date Format");
    expect(() => convertOne({ "Release Date": "" })).toThrow("Unkown Date Format");
  });
});

describe("field parsing", () => {
  it("maps the Watch Date column to startDate, the name the shared year filter expects", () => {
    expect(convertOne().startDate).toBe(YearMonthDay.get(2017, 1, 14));
    expect(convertOne().releaseDate).toBe(YearMonthDay.get(2016, 11, 11));
  });

  it("yields NaN for blank numbers rather than undefined, unlike the games converter", () => {
    const movie = convertOne({ Rating: "", Score: "", Runtime: "" });

    expect(movie.rating).toBeNaN();
    expect(movie.score).toBeNaN();
    expect(movie.minutes).toBeNaN();
  });

  it("carries the remaining columns through untouched", () => {
    const movie = convertOne();

    expect(movie.name).toBe("Arrival");
    expect(movie.genre).toBe("Science Fiction");
    expect(movie.director).toBe("Denis Villeneuve");
    expect(movie.minutes).toBe(116);
  });
});
