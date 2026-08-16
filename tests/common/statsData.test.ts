import { describe, expect, it } from "vitest";
import { groupTotals } from "../../src/common/statsData";
import type { Colour } from "../../src/utils/types";

type Row = { status: string; hours: number };

const rows = (...statuses: string[]): Row[] => statuses.map((status) => ({ status, hours: 1 }));
const colour = () => "#ff0000" as Colour;
const count = (data: Row[]) => data.length;
const sumPercents = (items: { percent: number }[]) => items.reduce((a, b) => a + b.percent, 0);

describe("groupTotals", () => {
  it("emits one segment per group value, in the order the whitelist gives them", () => {
    const totals = groupTotals(rows("a", "b", "b"), ["a", "b"], "status", count, colour);

    expect(totals.map((t) => t.name)).toEqual(["a", "b"]);
    expect(totals.map((t) => t.count)).toEqual([1, 2]);
  });

  it("drops a group nothing falls into, rather than drawing a zero-width segment", () => {
    const totals = groupTotals(rows("a"), ["a", "b", "c"], "status", count, colour);

    expect(totals.map((t) => t.name)).toEqual(["a"]);
  });

  it("fills the bar exactly when the whitelist covers every value", () => {
    const totals = groupTotals(rows("a", "b", "b", "b"), ["a", "b"], "status", count, colour);

    expect(sumPercents(totals)).toBeCloseTo(100, 10);
    expect(totals.map((t) => t.percent)).toEqual([25, 75]);
  });

  it("uses the measure it is given rather than assuming a row count", () => {
    const byHours = (data: Row[]) => data.reduce((a, b) => a + b.hours, 0);
    const data = [
      { status: "a", hours: 3 },
      { status: "b", hours: 1 },
    ];

    expect(groupTotals(data, ["a", "b"], "status", byHours, colour).map((t) => t.percent)).toEqual([75, 25]);
  });

  it("inflates the first segment by everything the whitelist leaves out", () => {
    // The total is measured over the whole dataset but segments only cover the whitelist, so
    // the uncovered rows are counted and then never drawn. assignPercents exists to absorb
    // rounding shortfall and folds this much larger gap into entry zero instead.
    // vg/Stats.tsx lists ["Beat", "Playing", "Endless", "Abandoned"] and omits the Status
    // union's "Backlog" and "Next", so the Beat bar carries the whole backlog.
    const data = rows("Beat", "Playing", "Backlog", "Backlog", "Next", "Next", "Next", "Next");
    const totals = groupTotals(data, ["Beat", "Playing"], "status", count, colour);

    // Beat is 1 of 8 rows, but it renders as seven eighths of the bar.
    expect(totals[0].name).toBe("Beat");
    expect(totals[0].count).toBe(1);
    expect(totals[0].percent).toBeCloseTo(87.5, 10);
    expect(sumPercents(totals)).toBeCloseTo(100, 10);
  });

  it("keeps the segment counts honest even while the percentages are not", () => {
    // Anything reading `count` is unaffected; only the drawn width is wrong.
    const data = rows("a", "a", "unlisted");
    const [a] = groupTotals(data, ["a"], "status", count, colour);

    expect(a.count).toBe(2);
    expect(a.percent).toBe(100);
  });

  it("returns nothing for an empty dataset", () => {
    expect(groupTotals([], ["a"], "status", count, colour)).toEqual([]);
  });

  it("carries each group's colour through", () => {
    const totals = groupTotals(rows("a"), ["a"], "status", count, (e) => `${e}-colour` as Colour);

    expect(totals[0].colour).toBe("a-colour");
  });
});
