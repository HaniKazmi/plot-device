import { describe, expect, it } from "vitest";
import { cacheKey, desaturate, isUsableColour, luma, withAlpha } from "../../src/utils/colourUtils";
import type { Colour } from "../../src/utils/types";
import { relativeLuminance } from "../fixtures/colour";

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

describe("cacheKey", () => {
  const BUCKET = "https://storage.googleapis.com/hanikazmi_plotdevice_show";

  it("encodes a banner the way the DOM does, so a raw sheet value finds what an img.src stored", () => {
    // Sheet cells hold the name unencoded, and almost every one of them contains a space.
    expect(cacheKey(`${BUCKET}/Ted Lasso`)).toBe(`${BUCKET}/Ted%20Lasso`);
    expect(cacheKey(`${BUCKET}/Star Trek: Strange New Worlds`)).toBe(`${BUCKET}/Star%20Trek:%20Strange%20New%20Worlds`);
  });

  it("is a fixed point on its own output, which is what makes reads and writes meet", () => {
    // Writes come from `img.src`, already an encoded href; reads come from the raw sheet value.
    // The two only agree if a second pass changes nothing.
    const encoded = cacheKey(`${BUCKET}/Ted Lasso`);
    expect(cacheKey(encoded)).toBe(encoded);
  });

  it("keeps the two Unicode spellings of one name apart, encoding each as UTF-8", () => {
    // Escaped because the two are indistinguishable on screen: a precomposed U+00E9 against an
    // e followed by a combining acute. Both spellings appear in the sheet, and the DOM draws the
    // same distinction, so the cache agreeing with itself matters more than merging them.
    expect(cacheKey(`${BUCKET}/Pok\u00e9mon`)).toBe(`${BUCKET}/Pok%C3%A9mon`);
    expect(cacheKey(`${BUCKET}/Poke\u0301mon`)).toBe(`${BUCKET}/Poke%CC%81mon`);
  });

  it("leaves a bare percent alone rather than double-encoding it", () => {
    // This is what rules out encodeURI, which escapes `%` and so corrupts an already-encoded src.
    expect(cacheKey(`${BUCKET}/100% Orange Juice`)).toBe(`${BUCKET}/100%%20Orange%20Juice`);
  });

  it("hands back anything it cannot parse, leaving it out of the cache rather than inventing a key", () => {
    expect(cacheKey("not a url")).toBe("not a url");
    expect(cacheKey("")).toBe("");
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

describe("desaturate", () => {
  it("returns the colour untouched at 0 and a grey at 1", () => {
    expect(desaturate("#fe4c00", 0)).toBe("#fe4c00");

    const grey = desaturate("#fe4c00", 1);
    expect(grey.slice(1, 3)).toBe(grey.slice(3, 5));
    expect(grey.slice(3, 5)).toBe(grey.slice(5, 7));
  });

  it.each(["#fe4c00", "#13ac00", "#0072c5", "#d5005e", "#7543ff", "#00a4b1"])(
    "holds %s's luminance, which is what carries its contrast over unchanged",
    (hex) => {
      // The whole reason this blends in linear light. Contrast is a function of luminance alone,
      // so a mute that preserves it cannot drop a fill under the floor its source cleared — and
      // four entries in the shared genre ramp sit within 0.1 of that floor.
      //
      // The bound is 8-bit rounding rather than the maths, which is exact: each channel lands on
      // an integer, drifting luminance by at most 0.0012. Holding it under 0.002 keeps that well
      // inside the ~0.005 that would actually cost the tightest entry its 3:1.
      expect(Math.abs(relativeLuminance(desaturate(hex, 0.45)) - relativeLuminance(hex))).toBeLessThan(0.002);
    },
  );

  it.each([0.1, 0.3, 0.5, 0.7, 0.9])("keeps luminance at amount %s, not just the one the app uses", (amount) => {
    expect(Math.abs(relativeLuminance(desaturate("#d5005e", amount)) - relativeLuminance("#d5005e"))).toBeLessThan(
      0.002,
    );
  });

  it("moves the colour, so a muted fill is never its own source", () => {
    expect(desaturate("#7543ff", 0.45)).not.toBe("#7543ff");
  });

  it("pads a dark channel to two digits, so the result is always six", () => {
    expect(desaturate("#000000", 0.45)).toBe("#000000");
    expect(desaturate("#0a0a0a", 0.45)).toBe("#0a0a0a");
  });

  it("reads a non-hex input as black, exactly as luma does", () => {
    expect(desaturate("red", 0.45)).toBe("#000000");
  });
});
