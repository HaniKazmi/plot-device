import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import {
  groupMoviesBy,
  latestWatched,
  movieGroupValue,
  movieHeroStats,
  perFilmAverages,
  yearlyAverages,
} from "../../src/movie/statsData";
import { movie } from "../fixtures/movies";

describe("movieGroupValue", () => {
  it("routes decade through the release year, not the watch year", () => {
    expect(movieGroupValue(movie({ releaseDate: YearMonthDay.get(1979, 6, 1) }), "decade")).toBe("1970s");
    expect(movieGroupValue(movie({ releaseDate: YearMonthDay.get(1942, 6, 1) }), "decade")).toBe("Pre-1970");
  });

  it("words the cinema flag as Cinema or Home", () => {
    expect(movieGroupValue(movie({ cinema: true }), "cinema")).toBe("Cinema");
    expect(movieGroupValue(movie({ cinema: false }), "cinema")).toBe("Home");
  });

  it("bands the score, with an absent score its own band rather than a low one", () => {
    expect(movieGroupValue(movie({ score: 9 }), "score")).toBe("9–10");
    expect(movieGroupValue(movie({ score: undefined }), "score")).toBe("Unscored");
  });

  it("passes plain string fields through unchanged", () => {
    expect(movieGroupValue(movie({ genre: "Horror" }), "genre")).toBe("Horror");
    expect(movieGroupValue(movie({ director: "Denis Villeneuve" }), "director")).toBe("Denis Villeneuve");
  });
});

describe("groupMoviesBy", () => {
  it("orders groups by count, most-watched first", () => {
    const data = [
      movie({ name: "A", genre: "Horror" }),
      movie({ name: "B", genre: "Comedy" }),
      movie({ name: "C", genre: "Comedy" }),
      movie({ name: "D", genre: "Comedy" }),
    ];

    expect(groupMoviesBy(data, "genre", "Films").map((g) => g.name)).toEqual(["Comedy", "Horror"]);
  });

  it("counts Films as a plain count and Hours as floored total minutes over 60", () => {
    const data = [
      movie({ name: "A", genre: "Horror", minutes: 100 }),
      movie({ name: "B", genre: "Horror", minutes: 100 }),
    ];

    expect(groupMoviesBy(data, "genre", "Films")[0].count).toBe(2);
    // 200 minutes = 3h20, floored to 3.
    expect(groupMoviesBy(data, "genre", "Hours")[0].count).toBe(3);
  });

  it("drops a franchise group of one, since a standalone film names itself there rather than starting a series", () => {
    const data = [movie({ name: "Arrival", franchise: "Arrival" })];

    expect(groupMoviesBy(data, "franchise", "Films")).toEqual([]);
  });

  it("keeps a series' first film even though it shares the franchise's own name", () => {
    const data = [
      movie({ name: "Alien", franchise: "Alien", minutes: 117 }),
      movie({ name: "Aliens", franchise: "Alien", minutes: 137 }),
    ];

    const groups = groupMoviesBy(data, "franchise", "Films");

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Alien");
    expect(groups[0].count).toBe(2);
    expect(groups[0].all.map((m) => m.name)).toContain("Alien");
  });

  it("names the longest film as the group's top, for its artwork", () => {
    const data = [
      movie({ name: "Alien", franchise: "Alien", minutes: 117 }),
      movie({ name: "Aliens", franchise: "Alien", minutes: 137 }),
    ];

    expect(groupMoviesBy(data, "franchise", "Films")[0].top.name).toBe("Aliens");
  });
});

describe("yearlyAverages", () => {
  it("averages over years anything was watched in, not the full calendar span", () => {
    // Watched in 2019 and 2021 only; a naive average over the span would divide by three years.
    const data = [
      movie({ startDate: YearMonthDay.get(2019, 1, 1), minutes: 120 }),
      movie({ startDate: YearMonthDay.get(2021, 1, 1), minutes: 120 }),
      movie({ startDate: YearMonthDay.get(2021, 1, 2), minutes: 120 }),
    ];

    expect(yearlyAverages(data).films).toBe(2);
  });
});

describe("perFilmAverages", () => {
  it("scores only over the films that were scored, so unscored films do not drag the average toward zero", () => {
    const data = [movie({ score: 10 }), movie({ score: 8 }), movie({ score: undefined })];

    expect(perFilmAverages(data).score).toBe(9);
  });

  it("takes the runtime average over every film, scored or not", () => {
    const data = [movie({ minutes: 100, score: undefined }), movie({ minutes: 200, score: 8 })];

    expect(perFilmAverages(data).minutes).toBe(150);
  });
});

describe("latestWatched", () => {
  it("answers the film watched most recently, which every watch date defines", () => {
    const older = movie({ name: "Alien", startDate: YearMonthDay.get(2014, 10, 30) });
    const newer = movie({ name: "Weapons", startDate: YearMonthDay.get(2026, 8, 9) });

    expect(latestWatched([older, newer])).toBe(newer);
  });

  it("answers nothing for an empty page rather than throwing", () => {
    expect(latestWatched([])).toBeUndefined();
  });
});

describe("movieHeroStats", () => {
  it("drops the score tile for an unscored film — 0/10 says something false", () => {
    const labels = movieHeroStats(movie({ score: undefined }), 1).map((stat) => stat.label);

    expect(labels).toEqual(["Minutes"]);
  });

  it("says the score in its own notation and counts the franchise only when it is a series", () => {
    const stats = movieHeroStats(movie({ score: 8, franchise: "Dune" }), 2);

    expect(stats[0]).toEqual({ label: "Score", value: "8/10" });
    expect(stats.at(-1)).toEqual({ label: "Dune Films", value: 2 });
  });
});
