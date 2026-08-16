import { describe, expect, it } from "vitest";
import { convertToCumulative, convertToRanking, groupDate } from "../../src/common/barchartData";
import { YearMonth } from "../../src/common/date";
import type { Colour } from "../../src/utils/types";

const RED = "#ff0000" as Colour;

const point = (name: string, year: number, month: number, value: number) => ({
  name,
  date: YearMonth.get(year, month),
  colour: RED,
  value,
});

describe("groupDate pivots flat records into a group-by-date matrix", () => {
  it("gives each group a row and each date a column", () => {
    const { results, dates, groups } = groupDate([point("a", 2024, 1, 1), point("a", 2024, 2, 2)]);

    expect(groups.map((g) => g.name)).toEqual(["a"]);
    expect(dates).toEqual([YearMonth.get(2024, 1), YearMonth.get(2024, 2)]);
    expect(results).toEqual([[1, 2]]);
  });

  it("adds together several records landing on the same group and date", () => {
    const { results } = groupDate([point("a", 2024, 1, 1), point("a", 2024, 1, 2)]);

    expect(results).toEqual([[3]]);
  });

  it("densifies gaps into real columns rather than skipping the missing months", () => {
    // A month with no activity has to occupy space on the axis, or the chart compresses time.
    const { results, dates } = groupDate([point("a", 2024, 1, 5), point("a", 2024, 4, 7)]);

    expect(dates).toHaveLength(4);
    expect(results).toEqual([[5, 0, 0, 7]]);
  });

  it("leaves the cells before a group's first record null, so its line starts where its data does", () => {
    // Zero would draw the series along the axis from the beginning of time, implying it existed
    // and measured nothing.
    const { results, groups } = groupDate([point("a", 2024, 1, 10), point("b", 2024, 3, 1)]);

    const b = results[groups.findIndex((g) => g.name === "b")];
    expect(b).toEqual([null, null, 1]);
  });

  it("fills zeros after a group has started, because a gap there is a real zero", () => {
    const { results, groups } = groupDate([point("a", 2024, 1, 1), point("b", 2024, 1, 1), point("a", 2024, 3, 1)]);

    expect(results[groups.findIndex((g) => g.name === "a")]).toEqual([1, 0, 1]);
    expect(results[groups.findIndex((g) => g.name === "b")]).toEqual([1, 0, 0]);
  });

  it("orders groups by total ascending, so the largest series is drawn last", () => {
    const { groups } = groupDate([point("small", 2024, 1, 1), point("big", 2024, 1, 100)]);

    expect(groups.map((g) => g.name)).toEqual(["small", "big"]);
  });

  it("sorts records by date first, so input order does not change the pivot", () => {
    const forwards = groupDate([point("a", 2024, 1, 1), point("a", 2024, 3, 3)]);
    const backwards = groupDate([point("a", 2024, 3, 3), point("a", 2024, 1, 1)]);

    expect(backwards.results).toEqual(forwards.results);
    expect(backwards.dates).toEqual(forwards.dates);
  });

  it("drops zero-valued records, which is how callers exclude untracked rows", () => {
    const { groups } = groupDate([point("a", 2024, 1, 0), point("b", 2024, 1, 5)]);

    expect(groups.map((g) => g.name)).toEqual(["b"]);
  });

  it("carries each group's colour through", () => {
    const { groups } = groupDate([{ ...point("a", 2024, 1, 1), colour: "#00ff00" as Colour }]);

    expect(groups[0].colour).toBe("#00ff00");
  });

  it("returns an empty pivot for no data", () => {
    expect(groupDate([])).toEqual({ results: [], dates: [], groups: [] });
  });

  it("keys columns by interned date identity, not by value", () => {
    // Two separately constructed YearMonths for the same month must land in one column.
    const { dates } = groupDate([point("a", 2024, 1, 1), { ...point("a", 2024, 1, 2), date: YearMonth.get(2024, 1) }]);

    expect(dates).toHaveLength(1);
  });
});

describe("convertToCumulative", () => {
  it("runs a total across each row", () => {
    expect(convertToCumulative([[1, 2, 3]])).toEqual([[1, 3, 6]]);
  });

  it("holds the leading nulls, so a late series still starts at its own first point", () => {
    expect(convertToCumulative([[null, null, 5, 5]])).toEqual([[null, null, 5, 10]]);
  });

  it("carries the running total across an interior zero", () => {
    expect(convertToCumulative([[1, 0, 2]])).toEqual([[1, 1, 3]]);
  });

  it("treats each row independently", () => {
    expect(
      convertToCumulative([
        [1, 1],
        [10, 10],
      ]),
    ).toEqual([
      [1, 2],
      [10, 20],
    ]);
  });

  it("returns an empty table unchanged", () => {
    expect(convertToCumulative([])).toEqual([]);
  });
});

describe("convertToRanking", () => {
  it("ranks each column independently, largest first", () => {
    expect(
      convertToRanking([
        [1, 30],
        [2, 20],
        [3, 10],
      ]),
    ).toEqual([
      [3, 1],
      [2, 2],
      [1, 3],
    ]);
  });

  it("counts a null as zero, so a series yet to start sits at the bottom", () => {
    expect(
      convertToRanking([
        [null, 5],
        [1, 1],
      ]),
    ).toEqual([
      [2, 1],
      [1, 2],
    ]);
  });

  it("breaks ties by row index, so equal series hold a stable order between columns", () => {
    expect(
      convertToRanking([
        [5, 5],
        [5, 5],
      ]),
    ).toEqual([
      [2, 2],
      [1, 1],
    ]);
  });

  it("returns one empty row per group when there are no columns", () => {
    expect(convertToRanking([[], []])).toEqual([[], []]);
  });
});
