import { describe, expect, it } from "vitest";
import {
  barchartSummary,
  columnTotals,
  convertToCumulative,
  convertToRanking,
  convertToShare,
  groupDate,
} from "../../src/common/barchartData";
import { Year, YearMonth } from "../../src/common/date";
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

describe("convertToShare", () => {
  it("gives each column's cells their percentage of that column", () => {
    expect(
      convertToShare([
        [1, 3],
        [3, 1],
      ]),
    ).toEqual([
      [25, 75],
      [75, 25],
    ]);
  });

  it("fills every column to 100, whatever the column's size", () => {
    const results = convertToShare([
      [1, 1000],
      [2, 1],
      [3, 7],
    ]);

    for (let col = 0; col < 2; col++) {
      expect(results.reduce((total, row) => total + (row[col] ?? 0), 0)).toBeCloseTo(100);
    }
  });

  it("gives a lone group the whole column", () => {
    expect(convertToShare([[7, 2]])).toEqual([[100, 100]]);
  });

  it("answers zero for a column that totals zero, so no NaN reaches a series", () => {
    // A dividing guard rather than a rendering one: NaN draws as a gap, which the chart already
    // uses to mean a series that has not started.
    expect(
      convertToShare([
        [0, 4],
        [0, 0],
      ]),
    ).toEqual([
      [0, 100],
      [0, 0],
    ]);
  });

  it("holds the leading nulls, so a late series still starts at its own first point", () => {
    expect(
      convertToShare([
        [null, 1],
        [5, 1],
      ]),
    ).toEqual([
      [null, 50],
      [100, 50],
    ]);
  });

  it("returns an empty table unchanged", () => {
    expect(convertToShare([])).toEqual([]);
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

describe("columnTotals", () => {
  it("adds each column across its groups, which is the height a stacked column stands at", () => {
    expect(
      columnTotals([
        [1, 2],
        [10, 20],
      ]),
    ).toEqual([11, 22]);
  });

  it("counts a null before a group's first data point as nothing, the way the chart draws it", () => {
    expect(
      columnTotals([
        [null, 5],
        [3, 4],
      ]),
    ).toEqual([3, 9]);
  });

  it("answers nothing for an empty pivot rather than throwing on a row that is not there", () => {
    expect(columnTotals([])).toEqual([]);
  });
});

const year = (name: string, value: number, y: number) => ({ name, date: Year.get(y), colour: RED, value });

describe("barchartSummary", () => {
  const summarise = (points: ReturnType<typeof year>[]) => {
    const { results, dates, groups } = groupDate(points);
    return barchartSummary(results, dates, groups);
  };

  it("names the fullest column and what it totals across every group", () => {
    const summary = summarise([year("a", 2, 2020), year("b", 3, 2020), year("a", 9, 2021)]);

    expect(summary?.peak).toEqual({ label: "2021", value: 9 });
  });

  it("gives a tie to the earlier column: a peak is where the library first reached its height", () => {
    const summary = summarise([year("a", 5, 2020), year("b", 1, 2020), year("a", 6, 2021)]);

    expect(summary?.peak.label).toBe("2020");
  });

  it("names the group at the top of the most columns", () => {
    const summary = summarise([
      year("a", 10, 2020),
      year("b", 1, 2020),
      year("a", 10, 2021),
      year("b", 1, 2021),
      year("b", 10, 2022),
      year("a", 1, 2022),
    ]);

    expect(summary?.leader).toEqual({ name: "a", columns: 2 });
  });

  it("skips a densified column nothing was recorded in, which has no leader to name", () => {
    // 2021 exists only because the axis has to be dense; counting it would credit whichever group
    // the ranking's own tiebreak happens to put first.
    const summary = summarise([year("a", 3, 2020), year("b", 1, 2020), year("a", 4, 2022)]);

    expect(summary?.leader).toEqual({ name: "a", columns: 2 });
    expect(summary?.columns).toBe(3);
  });

  it("names no leader where one group is drawn, having nothing to lead against", () => {
    expect(summarise([year("a", 1, 2020), year("a", 2, 2021)])?.leader).toBeUndefined();
  });

  it("counts every column the pivot holds, gaps included, since the chart draws them", () => {
    expect(summarise([year("a", 1, 2020), year("a", 1, 2023)])?.columns).toBe(4);
  });

  it("says what one column is, so the line reads in the grain the axis is drawn at", () => {
    expect(summarise([year("a", 1, 2020)])?.grain).toBe("years");
  });

  it("labels a month column with its month and year, where a year column is the bare year", () => {
    const { results, dates, groups } = groupDate([point("a", 2024, 3, 1)]);

    expect(barchartSummary(results, dates, groups)?.peak.label).toBe("Mar 2024");
    expect(barchartSummary(results, dates, groups)?.grain).toBe("months");
  });

  it("answers nothing for an empty pivot, which has no peak and no leader", () => {
    expect(summarise([])).toBeUndefined();
  });
});
