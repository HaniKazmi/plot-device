import { describe, expect, it } from "vitest";
import { stepIndex } from "../../src/common/keyboard";

describe("stepIndex", () => {
  it("steps along the list and wraps at either end", () => {
    expect(stepIndex(1, 1, 5)).toBe(2);
    expect(stepIndex(4, 1, 5)).toBe(0);
    expect(stepIndex(0, -1, 5)).toBe(4);
  });
});
