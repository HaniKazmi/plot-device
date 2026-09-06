import { describe, expect, it } from "vitest";
import { scrolledPastBar } from "../../src/common/chrome";

/**
 * The app bar's own height, restated here rather than imported: the module keeps it private, and a
 * test that read it back would pass whatever the threshold moved to.
 */
const BAR = 56;

describe("scrolledPastBar", () => {
  it("is false against the top of the page and true well past the bar", () => {
    expect(scrolledPastBar(0, false)).toBe(false);
    expect(scrolledPastBar(400, false)).toBe(true);
    expect(scrolledPastBar(400, true)).toBe(true);
    expect(scrolledPastBar(0, true)).toBe(false);
  });

  it("holds whichever answer it has while the page rests inside the band, so nothing flickers", () => {
    // The two surfaces this drives — the bar's tabs/rail swap and the top edge's tint — are the
    // whole reason the band exists: at the same offset the answer depends only on where the reader
    // came from.
    expect(scrolledPastBar(BAR, false)).toBe(false);
    expect(scrolledPastBar(BAR, true)).toBe(true);
  });

  it("needs the page past the far edge before it turns on, and back past the near one before it turns off", () => {
    expect(scrolledPastBar(BAR + 8, false)).toBe(false);
    expect(scrolledPastBar(BAR + 9, false)).toBe(true);
    expect(scrolledPastBar(BAR - 8, true)).toBe(false);
    expect(scrolledPastBar(BAR - 7, true)).toBe(true);
  });
});
