import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import type { AgeRating } from "../../src/utils/types";
import { decadeToColour, neutralFill, releaseDecade } from "../../src/utils/types";
import {
  cinemaToColour,
  groupToColour,
  scoreBand,
  scoreBandToColour,
  scoreBands,
  type ScoreBand,
} from "../../src/movie/types";
import { movie } from "../fixtures/movies";

const LIVE_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "True Story",
];

describe("genre colours", () => {
  it.each(LIVE_GENRES)("resolves %s to a colour of its own, not the neutral fallback", (genre) => {
    expect(groupToColour("genre", movie({ genre }), "light")).not.toBe(neutralFill("light"));
  });
});

describe("scoreBand", () => {
  it.each([
    [9, "9–10"],
    [8, "7–8"],
    [7, "7–8"],
    [6, "5–6"],
    [5, "5–6"],
    [4, "3–4"],
    [3, "3–4"],
    [2, "1–2"],
    [1, "1–2"],
    [undefined, "Unscored"],
  ] as const)("bands a score of %s as %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
});

describe("scoreBandToColour", () => {
  it.each(scoreBands)("has a colour for every band, including %s", (band) => {
    expect(scoreBandToColour(band, "light")).toBeTruthy();
  });

  it("gives Unscored the neutral fill, the colour of 'nothing to say here'", () => {
    expect(scoreBandToColour("Unscored" as ScoreBand, "light")).toBe(neutralFill("light"));
  });
});

describe("cinemaToColour", () => {
  it("gives Cinema and Home distinct fills", () => {
    expect(cinemaToColour("Cinema", "light")).not.toBe(cinemaToColour("Home", "light"));
    expect(cinemaToColour("Cinema", "light")).toBeTruthy();
    expect(cinemaToColour("Home", "light")).toBeTruthy();
  });
});

describe("groupToColour", () => {
  it("takes decade from the release year, not the watch year", () => {
    const film = movie({ releaseDate: YearMonthDay.get(1965, 1, 1), startDate: YearMonthDay.get(2020, 1, 1) });

    expect(groupToColour("decade", film, "light")).toBe(decadeToColour(releaseDecade(1965), "light"));
  });

  it("dispatches cinema and score through their own lookups", () => {
    const film = movie({ cinema: true, score: 9 });

    expect(groupToColour("cinema", film, "light")).toBe(cinemaToColour("Cinema", "light"));
    expect(groupToColour("score", film, "light")).toBe(scoreBandToColour("9–10", "light"));
  });

  it("colours a franchise from the shared table, and hands the rest to Highcharts", () => {
    // Most films name themselves in the franchise column and take the empty answer; a director is
    // an open set of names with no brand to reproduce, and never gets one.
    expect(groupToColour("franchise", movie({ franchise: "Marvel" }), "light")).not.toBe("");
    expect(groupToColour("franchise", movie({ franchise: "Some One-Off Film" }), "light")).toBe("");
    expect(groupToColour("director", movie(), "light")).toBe("");
    expect(groupToColour("name", movie(), "light")).toBe("");
  });

  it("propagates the rating throw, the deliberate catch for a spreadsheet typo", () => {
    expect(() => groupToColour("rating", movie({ rating: "PG-13" as AgeRating }), "light")).toThrow("Unknown rating");
  });
});

describe("releaseDecade and decadeToColour", () => {
  it("resolves a pre-1970 year to a real fill, not the neutral fallback", () => {
    expect(releaseDecade(1965)).toBe("Pre-1970");
    expect(decadeToColour(releaseDecade(1965), "light")).not.toBe(neutralFill("light"));
  });

  it("falls back to the neutral fill for a decade string it does not recognise", () => {
    expect(decadeToColour("Not-A-Decade", "light")).toBe(neutralFill("light"));
  });
});
