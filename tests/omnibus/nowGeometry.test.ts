import { describe, expect, it } from "vitest";
import { denseNowGeometry, NOW_GEOMETRY } from "../../src/omnibus/nowGeometry";

describe("the Now band's geometry", () => {
  it("states one card width from a full-height poster beside its column of words", () => {
    // 380 tall at 0.68 is 258, plus the 176px column; a banner across that stands 244 at 16:9.
    expect(NOW_GEOMETRY).toEqual({ cardWidth: 434, height: 380, posterArtWidth: 258, bannerArtHeight: 244 });
  });

  it("seats four on one row where the measured width gives each card its floor", () => {
    // The widest container's row: 1,536 less 24px of padding a side, shared four ways with three
    // gaps between — 366 each, a 16:9 banner 206 tall over its 136px panel, and a poster at 0.68
    // of that height.
    expect(denseNowGeometry(1488)).toEqual({ cardWidth: 366, height: 342, posterArtWidth: 233, bannerArtHeight: 206 });
  });

  it("gives no one-row geometry one pixel under the floor, so the band seats two and two instead", () => {
    expect(denseNowGeometry(1487)).toBeUndefined();
    expect(denseNowGeometry(1152)).toBeUndefined();
  });

  it("grows with a wider row rather than stopping at the floor", () => {
    expect(denseNowGeometry(1688)?.cardWidth).toBe(416);
  });
});
