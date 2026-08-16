import { describe, expect, it } from "vitest";
import { arrayToJson } from "../../src/utils/arrayUtils";

describe("arrayToJson", () => {
  it("keys each row by the header row, which is the whole contract with the Sheets API", () => {
    expect(
      arrayToJson([
        ["Game", "Platform"],
        ["Zelda", "Nintendo Switch"],
        ["Halo", "Xbox 360"],
      ]),
    ).toEqual([
      { Game: "Zelda", Platform: "Nintendo Switch" },
      { Game: "Halo", Platform: "Xbox 360" },
    ]);
  });

  it("omits keys for cells a short row does not reach", () => {
    // Sheets truncates trailing empty cells, so short rows are the norm, not an anomaly.
    const [row] = arrayToJson([
      ["Game", "Platform", "Hours"],
      ["Zelda", "Nintendo Switch"],
    ]);

    expect(row).toEqual({ Game: "Zelda", Platform: "Nintendo Switch" });
    expect("Hours" in row).toBe(false);
  });

  it('collects overhanging cells under "undefined" when a row is longer than the header', () => {
    const [row] = arrayToJson([["Game"], ["Zelda", "extra"]]);

    expect(row).toEqual({ Game: "Zelda", undefined: "extra" });
  });

  it("lets a later duplicate header win, so a repeated column silently shadows the first", () => {
    const [row] = arrayToJson([
      ["Name", "Name"],
      ["first", "second"],
    ]);

    expect(row).toEqual({ Name: "second" });
  });

  it("returns no rows for a header-only or empty grid instead of throwing", () => {
    expect(arrayToJson([["Game", "Platform"]])).toEqual([]);
    expect(arrayToJson([])).toEqual([]);
  });
});

describe("Array.prototype.sum", () => {
  it("adds a numeric field across objects", () => {
    expect([{ n: 1 }, { n: 2 }, { n: 3 }].sum("n")).toBe(6);
  });

  it("counts a missing or undefined field as 0 rather than poisoning the total with NaN", () => {
    expect([{ n: 1 }, { n: undefined }, {} as { n?: number }].sum("n")).toBe(1);
  });

  it("adds a bare number array when given no key", () => {
    // The runtime supports this, but the declared key type resolves to `void` for a number
    // array and TypeScript still demands an argument, so no production call site can reach it.
    const numbers = [1, 2, 3] as unknown as { sum: () => number };

    expect(numbers.sum()).toBe(6);
  });

  it("returns 0 for an empty array", () => {
    expect(([] as { n: number }[]).sum("n")).toBe(0);
  });
});

describe("Array.prototype.sortByKey", () => {
  const items = [{ n: 2 }, { n: 3 }, { n: 1 }];

  it("sorts descending when no direction is given, which is what most call sites rely on", () => {
    expect(items.sortByKey("n").map((i) => i.n)).toEqual([3, 2, 1]);
  });

  it("sorts ascending only when asked explicitly", () => {
    expect(items.sortByKey("n", true).map((i) => i.n)).toEqual([1, 2, 3]);
  });

  it("puts falsy values first in both directions, because the falsy check precedes the comparison", () => {
    // A 0 count or an empty-string name jumps the queue regardless of direction. Callers that
    // slice a top-N off the front get those rows instead of the largest ones.
    const withZero = [{ n: 2 }, { n: 0 }, { n: 1 }];

    expect(withZero.sortByKey("n").map((i) => i.n)).toEqual([0, 2, 1]);
    expect(withZero.sortByKey("n", true).map((i) => i.n)).toEqual([0, 1, 2]);
  });

  it("leaves the receiver untouched", () => {
    const original = [{ n: 2 }, { n: 1 }];
    const sorted = original.sortByKey("n");

    expect(sorted).not.toBe(original);
    expect(original.map((i) => i.n)).toEqual([2, 1]);
  });
});
