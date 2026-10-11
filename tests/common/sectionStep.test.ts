import { describe, expect, it } from "vitest";
import { sectionStep } from "../../src/common/sectionStep";

/** Four sections; the reader's landing line is 72px down, as the pinned rail's is from `sm` up. */
const LINE = 72;

describe("sectionStep", () => {
  it("goes to the first section from the bands above it, and to the page's top back from there", () => {
    const tops = [400, 1200, 2000, 2800];
    expect(sectionStep(tops, LINE, 1)).toBe(0);
    expect(sectionStep(tops, LINE, -1)).toBe(-1);
  });

  it("steps from a landed section to its neighbours, a fractional pixel off the line still landed", () => {
    const tops = [-728, 72.5, 872, 1672];
    expect(sectionStep(tops, LINE, 1)).toBe(2);
    expect(sectionStep(tops, LINE, -1)).toBe(0);
  });

  it("goes back to the start of the section the reader is partway through before the one above", () => {
    const tops = [-1500, -300, 500, 1300];
    expect(sectionStep(tops, LINE, -1)).toBe(1);
    expect(sectionStep(tops, LINE, 1)).toBe(2);
  });

  it("has nowhere to go past the last section", () => {
    expect(sectionStep([-2400, -1600, -800, 72], LINE, 1)).toBeUndefined();
  });

  it("steps from where a scroll is still travelling rather than from where the page has got to", () => {
    // The first press aimed at section 2 and the page is still passing section 1.
    const tops = [-500, 30, 830, 1630];
    expect(sectionStep(tops, LINE, 1, 2)).toBe(3);
    expect(sectionStep(tops, LINE, -1, 2)).toBe(1);
    // Travelling to the top: there is nothing further up to aim at.
    expect(sectionStep(tops, LINE, -1, -1)).toBeUndefined();
  });
});
