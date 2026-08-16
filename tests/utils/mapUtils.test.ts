import { describe, expect, it } from "vitest";
import "../../src/utils/mapUtils";

describe("Map.prototype.setIfAbsent", () => {
  it("stores and returns the new value on a miss", () => {
    const map = new Map<string, number>();

    expect(map.setIfAbsent("a", 1)).toBe(1);
    expect(map.get("a")).toBe(1);
  });

  it("returns the existing value on a hit and discards the argument", () => {
    const map = new Map<string, number>([["a", 1]]);

    expect(map.setIfAbsent("a", 2)).toBe(1);
    expect(map.get("a")).toBe(1);
  });

  it("hands back the stored reference, which callers mutate in place", () => {
    // Barchart and Timeline both accumulate by pushing into the returned array; a copy would
    // drop every entry after the first.
    const map = new Map<string, number[]>();

    map.setIfAbsent("a", []).push(1);
    map.setIfAbsent("a", []).push(2);

    expect(map.get("a")).toEqual([1, 2]);
  });

  it("treats a key mapped to undefined as absent and overwrites it", () => {
    // The check is `=== undefined`, not `has`, so an explicit undefined is indistinguishable
    // from a missing key.
    const map = new Map<string, number | undefined>([["a", undefined]]);

    expect(map.setIfAbsent("a", 1)).toBe(1);
    expect(map.get("a")).toBe(1);
  });

  it("keeps other falsy values, which are genuinely present", () => {
    const map = new Map<string, number>([["a", 0]]);

    expect(map.setIfAbsent("a", 9)).toBe(0);
  });
});
