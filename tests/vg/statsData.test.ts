import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { groupGamesBy, perGameAverages, topNWithOther, topOptions, yearlyAverages } from "../../src/vg/statsData";
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

  it('buckets a missing category under the literal string "undefined"', () => {
    // Object.groupBy stringifies the key, so the absent value becomes a real group rather than
    // being skipped. Only topNWithOther filters it back out; MostPlayedCategory does not.
    const data = [videoGame({ franchise: undefined as unknown as string })];

    expect(groupGamesBy(data, "franchise", "Games").map((g) => g.name)).toEqual(["undefined"]);
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

  it("discards the undefined and empty-string buckets before ranking", () => {
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
