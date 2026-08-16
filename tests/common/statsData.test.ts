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

  it("ignores values the whitelist leaves out rather than folding them into the first segment", () => {
    // vg/Stats.tsx lists Beat, Playing, Endless and Abandoned, omitting the Status union's
    // Backlog and Next. Measured against the whole dataset the uncovered rows would be counted
    // and never drawn, and assignPercents — built to absorb rounding — would put that entire
    // remainder on Beat.
    const data = rows("Beat", "Playing", "Backlog", "Backlog", "Next", "Next", "Next", "Next");
    const totals = groupTotals(data, ["Beat", "Playing"], "status", count, colour);

    expect(totals.map((t) => [t.name, t.count])).toEqual([
      ["Beat", 1],
      ["Playing", 1],
    ]);
    expect(totals.map((t) => t.percent)).toEqual([50, 50]);
  });

  it("reads as a share of the groups shown, so the bar always fills", () => {
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
