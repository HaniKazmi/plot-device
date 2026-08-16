import { describe, expect, it } from "vitest";
import { assignPercents } from "../../src/utils/mathUtils";

const sumPercents = (items: { percent: number }[]) => items.reduce((a, b) => a + b.percent, 0);

describe("assignPercents", () => {
  it("fills the bar exactly, so a stack never leaves a gap or overflows", () => {
    const result = assignPercents([{ count: 3 }, { count: 1 }], 4);

    expect(sumPercents(result)).toBeCloseTo(100, 10);
    expect(result.map((r) => r.percent)).toEqual([75, 25]);
  });

  it("floors a slice at 0.5% so a category too small to see still gets a sliver", () => {
    // 1 in 10_000 is 0.01%, which would round to an invisible zero-width segment.
    const [big, tiny] = assignPercents([{ count: 9999 }, { count: 1 }], 10_000);

    expect(tiny.percent).toBe(0.5);
    expect(big.percent + tiny.percent).toBeCloseTo(100, 10);
  });

  it("absorbs the shortfall into the first entry, which is why callers pre-sort largest-first", () => {
    // Twenty floored slices claim 10% between them; the leader gives that back.
    const items = [{ count: 1000 }, ...Array.from({ length: 20 }, () => ({ count: 1 }))];
    const result = assignPercents(items, 1020);

    expect(sumPercents(result)).toBeCloseTo(100, 10);
    expect(result.slice(1).every((r) => r.percent === 0.5)).toBe(true);
    expect(result[0].percent).toBeLessThan((1000 / 1020) * 100);
  });

  it("drives the first entry negative when the floors claim more than the whole bar", () => {
    // 300 slices at a 0.5% floor demand 150%. Nothing clamps the correction, so the leader
    // goes negative rather than the total exceeding 100 — the bar breaks visibly, not silently.
    const result = assignPercents(
      Array.from({ length: 300 }, () => ({ count: 1 })),
      300,
    );

    expect(result[0].percent).toBeLessThan(0);
    expect(sumPercents(result)).toBeCloseTo(100, 10);
  });

  it("returns an empty array untouched rather than indexing into nothing", () => {
    expect(assignPercents([], 0)).toEqual([]);
  });

  it("produces a non-finite percent when total is 0, because nothing guards the division", () => {
    // Both call sites derive `total` from the data, so an empty dataset reaches here.
    const [only] = assignPercents([{ count: 1 }], 0);

    expect(Number.isFinite(only.percent)).toBe(false);
  });

  it("copies each item instead of mutating the caller's objects", () => {
    const input = [{ count: 1, name: "a" }];
    const [result] = assignPercents(input, 1);

    expect(result).not.toBe(input[0]);
    expect(result.name).toBe("a");
    expect(input[0]).not.toHaveProperty("percent");
  });
});
