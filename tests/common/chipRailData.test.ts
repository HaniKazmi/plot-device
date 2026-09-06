import { describe, expect, it } from "vitest";
import { RAIL_FOLLOW_MARGIN, railScrollTarget } from "../../src/common/chipRailData";

/** A row 300px wide holding chips 60px wide at a 70px pitch. */
const VIEW = 300;
const CHIP = 60;
const at = (index: number) => index * 70;

describe("railScrollTarget", () => {
  it("leaves the row where it is when the chip is already clear of both edges", () => {
    expect(railScrollTarget(0, VIEW, at(1), CHIP)).toBe(0);
    expect(railScrollTarget(0, VIEW, at(2), CHIP)).toBe(0);
  });

  it("brings a chip past the trailing edge in with a margin beyond it", () => {
    // The fifth chip runs 350–410 against a row showing 0–300.
    expect(railScrollTarget(0, VIEW, at(5), CHIP)).toBe(at(5) + CHIP + RAIL_FOLLOW_MARGIN - VIEW);
  });

  it("brings a chip past the leading edge back in with a margin before it", () => {
    expect(railScrollTarget(400, VIEW, at(3), CHIP)).toBe(at(3) - RAIL_FOLLOW_MARGIN);
  });

  it("shows the start of a chip too wide for the row to hold with its margins", () => {
    expect(railScrollTarget(0, VIEW, 500, 400)).toBe(500 - RAIL_FOLLOW_MARGIN);
  });

  it("never asks for a negative offset, so the first chip stands at the row's own start", () => {
    expect(railScrollTarget(0, VIEW, 0, CHIP)).toBe(0);
    expect(railScrollTarget(10, VIEW, 0, CHIP)).toBe(0);
  });
});
