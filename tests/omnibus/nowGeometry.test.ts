import { describe, expect, it } from "vitest";
import { MEDIA } from "../../src/utils/types";
import {
  denseNowGeometry,
  NOW_GAP,
  NOW_GEOMETRY,
  NOW_PHONE_ORDER,
  nowPortraitHeight,
  pairNowGeometry,
} from "../../src/omnibus/nowGeometry";

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

  it("shares the row two ways, the poster taking its natural width where the column allows", () => {
    // 740 halved with one gap between — 366 each, a 16:9 banner 206 tall over its 136px panel,
    // and a poster at 0.68 of that height, which is inside the column and so unclamped.
    expect(pairNowGeometry(740)).toEqual({ cardWidth: 366, height: 342, posterArtWidth: 233, bannerArtHeight: 206 });
  });

  it("keeps the pair on a tablet's row and holds the poster to the column's remainder", () => {
    // A 768px tablet's row is 720: two cards of 356, a 200px banner over its 136px panel, and a
    // poster the row's 336 would draw 228 wide — 5px into the 133px column — so it stands 223.
    expect(pairNowGeometry(720)).toEqual({ cardWidth: 356, height: 336, posterArtWidth: 223, bannerArtHeight: 200 });
  });

  it("keeps two to a row on the narrowest row above the phone, spending the poster to do it", () => {
    // A 600px viewport's row is 552, two cards of 272: the poster beside its 133px column stands
    // 139 wide in a 289px card rather than the 197 the row's height would give it.
    expect(pairNowGeometry(552)).toEqual({ cardWidth: 272, height: 289, posterArtWidth: 139, bannerArtHeight: 153 });
  });

  // A card wider than half its row can only stand one to a row, so a share refused is four rows of
  // a stated card — 1,544px against the 590 the same row's pair costs.
  it("never draws a card the row cannot hold two of", () => {
    for (let rowWidth = 400; rowWidth <= 1600; rowWidth++) {
      const { cardWidth } = pairNowGeometry(rowWidth);
      expect(2 * cardWidth + NOW_GAP).toBeLessThanOrEqual(Math.max(rowWidth, 2 * NOW_GEOMETRY.cardWidth + NOW_GAP));
    }
  });

  it("reaches the stated card and stops there, which is the row the four-card cap is set at", () => {
    // Two stated cards and a gap between them: 876. One pixel under it the share is a pixel short.
    expect(pairNowGeometry(2 * NOW_GEOMETRY.cardWidth + NOW_GAP)).toEqual(NOW_GEOMETRY);
    expect(pairNowGeometry(1488)).toEqual(NOW_GEOMETRY);
    expect(pairNowGeometry(875).cardWidth).toBe(433);
  });

  it("gives the pair a card wider than the four-way share of the same row", () => {
    expect(pairNowGeometry(1488).cardWidth).toBeGreaterThan(denseNowGeometry(1488)!.cardWidth);
  });

  // The figure is a floor on the words, not on the card: the column is the card less the poster the
  // row's height gives it, so it is what the figure was chosen for and what the clamp protects at
  // every width the pair is drawn at, the four-way share's own floor included.
  it("leaves a poster's column of words at 133px wherever the clamp is what sizes it", () => {
    const column = (geometry: { cardWidth: number; posterArtWidth: number }) =>
      geometry.cardWidth - geometry.posterArtWidth;

    expect(column(denseNowGeometry(1488)!)).toBe(133);
    expect(column(pairNowGeometry(740))).toBe(133);
    expect(column(pairNowGeometry(720))).toBe(133);
    expect(column(pairNowGeometry(648))).toBe(133);
    expect(column(pairNowGeometry(552))).toBe(133);
  });

  it("holds the phone's portrait row at the poster's height beside the spine, taller on a wider phone", () => {
    // A 390px phone's row is 358, its cell 175; a 430px phone's 398 and 195. The poster takes what
    // the spine leaves and stands at its ratio from that, and the cover beside it is held to the
    // same height whatever ratio its file has.
    expect(nowPortraitHeight(358)).toBe(204);
    expect(nowPortraitHeight(398)).toBe(234);
  });
});

describe("the phone's cell order", () => {
  it("seats every medium once, so no medium has a card from `sm` up and no cell on a phone", () => {
    expect([...NOW_PHONE_ORDER].toSorted()).toEqual([...MEDIA].toSorted());
  });
});
