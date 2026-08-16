import { describe, expect, it } from "vitest";
import { isUsableColour, luma, withAlpha } from "../../src/utils/colourUtils";
import type { Colour } from "../../src/utils/types";

describe("luma", () => {
  it("weights green far above red and blue, per ITU-R BT.709", () => {
    expect(luma("#ff0000")).toBeCloseTo(0.2126 * 255, 6);
    expect(luma("#00ff00")).toBeCloseTo(0.7152 * 255, 6);
    expect(luma("#0000ff")).toBeCloseTo(0.0722 * 255, 6);
  });

  it("puts black at 0 and white at 255", () => {
    expect(luma("#000000")).toBe(0);
    expect(luma("#ffffff")).toBeCloseTo(255, 6);
  });

  it("reads a colour with or without the leading hash", () => {
    expect(luma("00ff00")).toBe(luma("#00ff00"));
  });

  it("reads anything unparseable as 0, the same as black", () => {
    // parseInt gives NaN and the bitwise extractions coerce it to zero, so a malformed colour
    // and black are indistinguishable here. Both end up rejected, so it does not matter.
    expect(luma("#zzzzzz")).toBe(0);
    expect(luma("")).toBe(0);
  });
});

describe("isUsableColour", () => {
  it("accepts a mid-range colour", () => {
    expect(isUsableColour("#808080")).toBe(true);
  });

  it("rejects colours too dark to read against", () => {
    expect(isUsableColour("#000000")).toBe(false);
    expect(isUsableColour("#0a0a0a")).toBe(false);
  });

  it("rejects colours too light to read against", () => {
    expect(isUsableColour("#ffffff")).toBe(false);
    expect(isUsableColour("#f5f5f5")).toBe(false);
  });

  it("accepts a colour on the dark bound and rejects one just below it", () => {
    // The lower bound is inclusive: a grey of 0x1e is exactly luma 30.
    expect(luma("#1e1e1e")).toBe(30);
    expect(isUsableColour("#1e1e1e")).toBe(true);
    expect(isUsableColour("#1d1d1d")).toBe(false);
  });

  it("rejects a colour comfortably past the light bound", () => {
    // Not asserted exactly at 230: the coefficients sum to 1 only to floating-point precision,
    // so a grey of 0x e6 computes as 229.99999999999997 and squeaks under the ceiling.
    expect(isUsableColour("#e8e8e8")).toBe(false);
    expect(isUsableColour("#d0d0d0")).toBe(true);
  });

  it("rejects an unparseable colour, since it reads as 0", () => {
    // This is what sends a bad result to the fallback algorithm rather than accepting it.
    expect(isUsableColour("not a colour")).toBe(false);
  });
});

describe("withAlpha", () => {
  it("appends the alpha byte to make an 8-digit hex colour", () => {
    expect(withAlpha("#ff0000" as Colour, "90")).toBe("#ff000090");
    expect(withAlpha("#ff0000" as Colour, "00")).toBe("#ff000000");
  });

  it("concatenates blindly, so a non-hex input yields something no browser will honour", () => {
    // Both call sites feed it a colour derived from artwork, which is always #rrggbb.
    expect(withAlpha("red", "90")).toBe("red90");
  });
});
