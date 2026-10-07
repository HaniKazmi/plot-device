import { describe, expect, it } from "vitest";
import {
  hoverCardArtworkSx,
  pictureAtHeight,
  shapeRatioValues,
  shapeToPinnedAspect,
  shapeToRatio,
  tiledArtworkSx,
  type ArtworkShape,
} from "../../src/common/cardArrangement";

const SHAPES: readonly ArtworkShape[] = ["banner", "poster", "cover"];

describe("shape ratios", () => {
  it("states each shape's ratio once, as a number and as the CSS a layout writes", () => {
    for (const shape of SHAPES) {
      const [width, height] = shapeToRatio(shape).split(" / ").map(Number);
      expect(width / height).toBeCloseTo(shapeRatioValues[shape], 10);
    }
  });

  it("holds a cover to 13:20, the ratio that crops the library's covers least", () => {
    expect(shapeRatioValues.cover).toBe(13 / 20);
  });
});

describe("tiledArtworkSx", () => {
  it("holds every shape to its ratio outright and crops a file off it, a cover included", () => {
    // Side by side, a picture's own ratio is a difference between neighbours that means nothing,
    // so no shape takes the `auto` reservation here — that would let one card's file move its row.
    for (const shape of SHAPES) {
      expect(tiledArtworkSx(shape)).toEqual({ aspectRatio: shapeToRatio(shape), objectFit: "cover" });
    }
  });
});

describe("pictureAtHeight", () => {
  it("is the tiled rule at a stated height, its width following from the shape", () => {
    for (const shape of SHAPES) {
      expect(pictureAtHeight(shape, 120)).toEqual({ height: 120, width: "auto", ...tiledArtworkSx(shape) });
    }
  });
});

describe("a picture shown on its own", () => {
  it("pins a banner and a poster, which every file is authored to", () => {
    expect(shapeToPinnedAspect("banner")).toBe(shapeToRatio("banner"));
    expect(shapeToPinnedAspect("poster")).toBe(shapeToRatio("poster"));
  });

  it("only reserves a cover's ratio, so the file's own shape wins once it lands", () => {
    expect(shapeToPinnedAspect("cover")).toBe(`auto ${shapeToRatio("cover")}`);
  });

  it("never crops a cover on a hover card", () => {
    const sx: Record<string, unknown> = hoverCardArtworkSx("cover");
    expect(sx.aspectRatio).toBe(`auto ${shapeToRatio("cover")}`);
    expect(sx.objectFit).toBeUndefined();
  });
});
