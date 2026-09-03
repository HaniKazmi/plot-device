import { describe, expect, it } from "vitest";
import { rowCardSize, type RowSizing } from "../../src/common/rowSizing";

/** A banner at 16:9 across the card, over a 22px band and a 65px footer, inside a 1px border. */
const sizing: RowSizing = {
  minWidth: 282,
  heightFor: (width) => 2 + 22 + Math.round((width - 2) / (16 / 9)) + 65,
};

describe("rowCardSize", () => {
  it("shares the row between as many cards as fit at the minimum, so they fill it exactly", () => {
    // 1488 holds five at 282 with 46 to spare; shared, each is 291 and five plus four gaps is 1488.
    const { width, count } = rowCardSize(sizing, 1488, 8);

    expect(width).toBe(291);
    expect(count).toBe(5);
    expect(5 * width + 4 * 8).toBeLessThanOrEqual(1488);
    expect(6 * 282 + 5 * 8).toBeGreaterThan(1488);
  });

  it("asks the height of the shared width, so every card in the row is one size", () => {
    expect(rowCardSize(sizing, 1488, 8).height).toBe(sizing.heightFor(291));
  });

  it("falls back to the minimum before the row has been measured, and in a row narrower than it", () => {
    expect(rowCardSize(sizing, undefined, 8)).toEqual({ width: 282, height: sizing.heightFor(282), count: 1 });
    expect(rowCardSize(sizing, 200, 8).width).toBe(282);
  });

  it("gives a row that fits one card the whole row", () => {
    expect(rowCardSize(sizing, 400, 8)).toEqual({ width: 400, height: sizing.heightFor(400), count: 1 });
  });

  it("never lets a card fall under the minimum through rounding", () => {
    for (let rowWidth = 282; rowWidth < 2000; rowWidth += 7) {
      expect(rowCardSize(sizing, rowWidth, 8).width).toBeGreaterThanOrEqual(282);
    }
  });
});
