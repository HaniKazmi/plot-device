import { describe, expect, it } from "vitest";
import { denseNowGeometry, NOW_GEOMETRY, NOW_ROW_HEIGHT, pairNowGeometry } from "../../src/omnibus/nowGeometry";
import { shapeRatioValues } from "../../src/common/cardArrangement";

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

  it("seats two to a row from the width that gives each of them the floor", () => {
    // 740 halved with one gap between — 366 each, a 16:9 banner 206 tall over its 136px panel,
    // and a poster at 0.68 of that height.
    expect(pairNowGeometry(740)).toEqual({ cardWidth: 366, height: 342, posterArtWidth: 233, bannerArtHeight: 206 });
  });

  it("keeps the pair on a tablet's row and holds the poster to the column's remainder", () => {
    // A 768px tablet's row is 720: two cards of 356, a 200px banner over its 136px panel, and a
    // poster the row's 336 would draw 228 wide — 5px into the 133px column — so it stands 223.
    expect(pairNowGeometry(720)).toEqual({ cardWidth: 356, height: 336, posterArtWidth: 223, bannerArtHeight: 200 });
  });

  it("gives no pair where the clamp would take a fifth of the poster, so the cards stand at their stated width", () => {
    // A 600px viewport's row is 552, two cards of 272: the poster beside a 133px column would be
    // 139 wide against the 204 its row gives.
    expect(pairNowGeometry(647)).toBeUndefined();
    expect(pairNowGeometry(552)).toBeUndefined();
  });

  it("gives the pair a card wider than the four-way share of the same row", () => {
    expect(pairNowGeometry(1488)!.cardWidth).toBeGreaterThan(denseNowGeometry(1488)!.cardWidth);
  });

  // The floor is a floor on the words, not on the card: the column is the card less the poster the
  // row's height gives it, so it is what the figure was chosen for and what both shares protect.
  it("leaves a poster's column of words at 133px at either share's floor", () => {
    const column = (geometry: { cardWidth: number; posterArtWidth: number }) =>
      geometry.cardWidth - geometry.posterArtWidth;

    expect(column(denseNowGeometry(1488)!)).toBe(133);
    expect(column(pairNowGeometry(740)!)).toBe(133);
    expect(column(pairNowGeometry(720)!)).toBe(133);
    expect(column(pairNowGeometry(648)!)).toBe(133);
  });

  it("holds every shape at the phone row's height, so no picture is cropped to fit", () => {
    // The widths a row of one height gives each shape: a banner, a poster and a cover, none of
    // them a size the row imposed.
    const widths = Object.values(shapeRatioValues).map((ratio) => Math.round(NOW_ROW_HEIGHT * ratio));
    expect(widths).toEqual([142, 54, 53]);
  });
});
