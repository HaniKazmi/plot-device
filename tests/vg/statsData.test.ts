import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import {
  currentlyPlaying,
  groupGamesBy,
  heroStats,
  perGameAverages,
  topNWithOther,
  topOptions,
  yearlyAverages,
} from "../../src/vg/statsData";
import { videoGame } from "../fixtures/vgRows";

describe("groupGamesBy", () => {
  it("counts games per category, most-played first", () => {
    const data = [
      videoGame({ franchise: "Zelda", hours: 10 }),
      videoGame({ franchise: "Mario", hours: 5 }),
      videoGame({ franchise: "Mario", hours: 5 }),
    ];

    expect(groupGamesBy(data, "franchise", "Games").map((g) => [g.name, g.count])).toEqual([
      ["Mario", 2],
      ["Zelda", 1],
    ]);
  });

  it("sums hours instead of counting when the measure is Hours", () => {
    const data = [
      videoGame({ franchise: "Zelda", hours: 10 }),
      videoGame({ franchise: "Mario", hours: 5 }),
      videoGame({ franchise: "Mario", hours: 3 }),
    ];

    expect(groupGamesBy(data, "franchise", "Hours").map((g) => [g.name, g.count])).toEqual([
      ["Zelda", 10],
      ["Mario", 8],
    ]);
  });

  it("only counts games that are both finished and time-tracked", () => {
    // An in-progress or untimed game has no meaningful playtime to attribute.
    const data = [
      videoGame({ franchise: "Zelda", hours: 10 }),
      videoGame({ franchise: "Unfinished", endDate: undefined }),
      videoGame({ franchise: "Untimed", hours: undefined }),
    ];

    expect(groupGamesBy(data, "franchise", "Games").map((g) => g.name)).toEqual(["Zelda"]);
  });

  it("names each group's top game by hours", () => {
    const data = [
      videoGame({ name: "small", franchise: "Zelda", hours: 5 }),
      videoGame({ name: "big", franchise: "Zelda", hours: 50 }),
    ];

    expect(groupGamesBy(data, "franchise", "Games")[0].top.name).toBe("big");
  });

  it("keeps every member of the group alongside the top one", () => {
    const data = [videoGame({ franchise: "Zelda" }), videoGame({ franchise: "Zelda" })];

    expect(groupGamesBy(data, "franchise", "Games")[0].all).toHaveLength(2);
  });

  it("leaves out games with no value for the category", () => {
    // Object.groupBy stringifies its key, so without this these would collect under the
    // literal string "undefined" and render as a category of that name.
    const data = [videoGame({ franchise: "Zelda" }), videoGame({ franchise: undefined as unknown as string })];

    expect(groupGamesBy(data, "franchise", "Games").map((g) => g.name)).toEqual(["Zelda"]);
  });

  it("leaves out games whose category is an empty string", () => {
    const data = [videoGame({ franchise: "Zelda" }), videoGame({ franchise: "" })];

    expect(groupGamesBy(data, "franchise", "Games").map((g) => g.name)).toEqual(["Zelda"]);
  });

  it("returns nothing for an empty dataset", () => {
    expect(groupGamesBy([], "franchise", "Games")).toEqual([]);
  });
});

describe("topNWithOther", () => {
  const many = (count: number) =>
    Array.from({ length: count }, (_, i) => videoGame({ franchise: `F${i}`, hours: count - i }));

  it("keeps every category when there are no more than the limit", () => {
    const result = topNWithOther(many(5), "franchise", "Hours");

    expect(result).toHaveLength(5);
    expect(result.some((r) => r.name === "Other")).toBe(false);
  });

  it("collapses everything past the limit into one Other bucket", () => {
    const result = topNWithOther(many(8), "franchise", "Hours");

    expect(result.map((r) => r.name)).toEqual(["F0", "F1", "F2", "F3", "F4", "Other"]);
    // F5 + F6 + F7 by hours.
    expect(result.at(-1)!.count).toBe(3 + 2 + 1);
  });

  it("gives Other no top game, because it stands for several categories", () => {
    const result = topNWithOther(many(8), "franchise", "Hours");

    expect(result.at(-1)!.top).toBeUndefined();
    expect(result[0].top).toBeDefined();
  });

  it("honours a caller-supplied limit", () => {
    expect(topNWithOther(many(8), "franchise", "Hours", 2).map((r) => r.name)).toEqual(["F0", "F1", "Other"]);
  });

  it("fills the bar exactly, because the percentages are scoped to the rows shown", () => {
    // Unlike groupTotals, nothing is left out here — Other accounts for the remainder — so the
    // first entry absorbs only rounding.
    const result = topNWithOther(many(8), "franchise", "Hours");

    expect(result.reduce((a, b) => a + b.percent, 0)).toBeCloseTo(100, 10);
  });

  it("inherits groupGamesBy's exclusion of games with no category", () => {
    const data = [
      videoGame({ franchise: "Zelda" }),
      videoGame({ franchise: "" }),
      videoGame({ franchise: undefined as unknown as string }),
    ];

    expect(topNWithOther(data, "franchise", "Games").map((r) => r.name)).toEqual(["Zelda"]);
  });
});

describe("topOptions", () => {
  it("lists the categories the Top list offers", () => {
    expect(topOptions).toEqual([
      "company",
      "format",
      "franchise",
      "platform",
      "developer",
      "publisher",
      "rating",
      "status",
      "genre",
    ]);
  });

  it("holds no duplicates, since the index drives each category's palette offset", () => {
    expect(new Set(topOptions).size).toBe(topOptions.length);
  });
});

describe("yearlyAverages", () => {
  it("averages games and hours over the years that have data", () => {
    const data = [
      videoGame({ startDate: YearMonthDay.get(2020, 1, 1), hours: 10 }),
      videoGame({ startDate: YearMonthDay.get(2020, 6, 1), hours: 20 }),
      videoGame({ startDate: YearMonthDay.get(2021, 1, 1), hours: 30 }),
    ];

    expect(yearlyAverages(data)).toEqual({ games: 1.5, hours: 30 });
  });

  it("ignores years in which nothing was time-tracked rather than counting them as zero", () => {
    const data = [
      videoGame({ startDate: YearMonthDay.get(2020, 1, 1), hours: 10 }),
      videoGame({ startDate: YearMonthDay.get(2021, 1, 1), hours: undefined }),
    ];

    expect(yearlyAverages(data)).toEqual({ games: 1, hours: 10 });
  });

  it("rounds a recurring average to two decimal places", () => {
    // 4 games across 3 years is 1.333…, which would otherwise render its full precision.
    const data = [
      videoGame({ startDate: YearMonthDay.get(2020, 1, 1), hours: 10 }),
      videoGame({ startDate: YearMonthDay.get(2020, 2, 1), hours: 10 }),
      videoGame({ startDate: YearMonthDay.get(2021, 1, 1), hours: 10 }),
      videoGame({ startDate: YearMonthDay.get(2022, 1, 1), hours: 20 }),
    ];

    expect(yearlyAverages(data).games).toBe(1.33);
    expect(yearlyAverages(data).hours).toBe(16.67);
  });

  it("yields NaN for empty data, because the year count is the divisor", () => {
    // Nothing guards the division, and the NaN reaches format() in the stat card.
    expect(yearlyAverages([]).games).toBeNaN();
    expect(yearlyAverages([]).hours).toBeNaN();
  });
});

describe("perGameAverages", () => {
  it("averages over games that were beaten, timed and dated", () => {
    const data = [
      videoGame({ status: "Beat", hours: 10, numDays: 5 }),
      videoGame({ status: "Beat", hours: 20, numDays: 15 }),
    ];

    expect(perGameAverages(data)).toEqual({ hours: 15, days: 10 });
  });

  it("excludes games that were never beaten", () => {
    const data = [
      videoGame({ status: "Beat", hours: 10, numDays: 10 }),
      videoGame({ status: "Abandoned", hours: 100, numDays: 100 }),
    ];

    expect(perGameAverages(data)).toEqual({ hours: 10, days: 10 });
  });

  it("excludes a beaten game with no hours or no day count", () => {
    const data = [
      videoGame({ status: "Beat", hours: 10, numDays: 10 }),
      videoGame({ status: "Beat", hours: undefined, numDays: 10 }),
      videoGame({ status: "Beat", hours: 10, numDays: undefined }),
    ];

    expect(perGameAverages(data)).toEqual({ hours: 10, days: 10 });
  });

  it("rounds to whole numbers", () => {
    const data = [
      videoGame({ status: "Beat", hours: 10, numDays: 1 }),
      videoGame({ status: "Beat", hours: 11, numDays: 2 }),
    ];

    expect(perGameAverages(data)).toEqual({ hours: 11, days: 2 });
  });

  it("yields NaN when nothing qualifies", () => {
    expect(perGameAverages([]).hours).toBeNaN();
  });
});

describe("currentlyPlaying", () => {
  it("keeps only games still being played, most recently started first", () => {
    const data = [
      videoGame({ name: "Older", status: "Playing", startDate: YearMonthDay.get(2024, 1, 1) }),
      videoGame({ name: "Beaten", status: "Beat" }),
      videoGame({ name: "Newer", status: "Playing", startDate: YearMonthDay.get(2024, 6, 1) }),
    ];

    expect(currentlyPlaying(data).map((game) => game.name)).toEqual(["Newer", "Older"]);
  });

  it("is empty rather than throwing when nothing is in progress", () => {
    expect(currentlyPlaying([videoGame({ status: "Beat" })])).toEqual([]);
  });
});

describe("heroStats", () => {
  const today = YearMonthDay.get(2024, 3, 11);

  it("counts the days the game has been in progress, both ends included", () => {
    // The inclusive count `numDays` and the Days To Beat card already use, so a game shows the
    // same span before and after it is finished.
    const game = videoGame({ startDate: YearMonthDay.get(2024, 3, 1), hours: undefined, franchise: "" });

    expect(heroStats(game, [game], today)).toEqual([{ label: "Days In", value: 11 }]);
  });

  it("reports the hours the sheet has logged against a game still being played", () => {
    const game = videoGame({ startDate: YearMonthDay.get(2024, 3, 1), hours: 12, franchise: "" });

    expect(heroStats(game, [game], today)).toContainEqual({ label: "Hours", value: 12 });
  });

  it("leaves the hours out rather than reporting zero for a game with none logged", () => {
    // The sheet only fills hours in for some in-progress games, and a tile reading 0 asserts
    // that none have been played rather than that none have been recorded.
    const game = videoGame({ startDate: YearMonthDay.get(2024, 3, 1), hours: 0, franchise: "" });

    expect(heroStats(game, [game], today).map((stat) => stat.label)).toEqual(["Days In"]);
  });

  it("places the game in its series once the series has more than one game", () => {
    const game = videoGame({ startDate: YearMonthDay.get(2024, 3, 1), hours: undefined, franchise: "Zelda" });

    expect(heroStats(game, [game, videoGame(), videoGame()], today)).toContainEqual({
      label: "Zelda Games",
      value: 3,
    });
  });

  it("says nothing about a series holding only this game", () => {
    const game = videoGame({ startDate: YearMonthDay.get(2024, 3, 1), hours: undefined, franchise: "Zelda" });

    expect(heroStats(game, [game], today).map((stat) => stat.label)).toEqual(["Days In"]);
  });

  it("skips the day count for a game the sheet recorded as a bare year", () => {
    // `daysTo` refuses to answer across a year-only date rather than inventing a day for it.
    const game = videoGame({ startDate: Year.get(2024), hours: 5, franchise: "" });

    expect(heroStats(game, [game], today).map((stat) => stat.label)).toEqual(["Hours"]);
  });

  it("skips the day count rather than throwing on a start date in the future", () => {
    // `daysTo` throws on a backwards comparison, which a mistyped sheet row can produce.
    const game = videoGame({ startDate: YearMonthDay.get(2025, 1, 1), hours: 5, franchise: "" });

    expect(heroStats(game, [game], today).map((stat) => stat.label)).toEqual(["Hours"]);
  });
});
