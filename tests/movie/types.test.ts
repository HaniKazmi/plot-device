import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import type { AgeRating } from "../../src/utils/types";
import { decadeToColour, NEUTRAL_FILL, releaseDecade } from "../../src/utils/types";
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
    expect(groupToColour("genre", movie({ genre }))).not.toBe(NEUTRAL_FILL);
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
    expect(scoreBandToColour(band)).toBeTruthy();
  });

  it("gives Unscored the neutral fill, the colour of 'nothing to say here'", () => {
    expect(scoreBandToColour("Unscored" as ScoreBand)).toBe(NEUTRAL_FILL);
  });
});

describe("cinemaToColour", () => {
  it("gives Cinema and Home distinct fills", () => {
    expect(cinemaToColour("Cinema")).not.toBe(cinemaToColour("Home"));
    expect(cinemaToColour("Cinema")).toBeTruthy();
    expect(cinemaToColour("Home")).toBeTruthy();
  });
});

describe("groupToColour", () => {
  it("takes decade from the release year, not the watch year", () => {
    const film = movie({ releaseDate: YearMonthDay.get(1965, 1, 1), startDate: YearMonthDay.get(2020, 1, 1) });

    expect(groupToColour("decade", film)).toBe(decadeToColour(releaseDecade(1965)));
  });

  it("dispatches cinema and score through their own lookups", () => {
    const film = movie({ cinema: true, score: 9 });

    expect(groupToColour("cinema", film)).toBe(cinemaToColour("Cinema"));
    expect(groupToColour("score", film)).toBe(scoreBandToColour("9–10"));
  });

  it("hands franchise, director and name to Highcharts, since none carries a colour of its own", () => {
    expect(groupToColour("franchise", movie())).toBe("");
    expect(groupToColour("director", movie())).toBe("");
    expect(groupToColour("name", movie())).toBe("");
  });

  it("propagates the rating throw, the deliberate catch for a spreadsheet typo", () => {
    expect(() => groupToColour("rating", movie({ rating: "PG-13" as AgeRating }))).toThrow("Unknown rating");
  });
});

describe("releaseDecade and decadeToColour", () => {
  it("resolves a pre-1970 year to a real fill, not the neutral fallback", () => {
    expect(releaseDecade(1965)).toBe("Pre-1970");
    expect(decadeToColour(releaseDecade(1965))).not.toBe(NEUTRAL_FILL);
  });

  it("falls back to the neutral fill for a decade string it does not recognise", () => {
    expect(decadeToColour("Not-A-Decade")).toBe(NEUTRAL_FILL);
  });
});
