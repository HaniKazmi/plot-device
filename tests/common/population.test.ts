import { describe, expect, it } from "vitest";
import { all, cut, stated } from "../../src/common/population";
import { format } from "../../src/utils/mathUtils";

/**
 * The figures go through `format`, which is an `Intl.NumberFormat` on the machine's own locale —
 * so the separator itself is not this suite's to assert. What is asserted is that every wording
 * puts its numbers through it, which is the bug the module exists to close: expectations are
 * composed from `format` rather than written out, and the three-digit cases pin the shape of the
 * sentence in literals no locale moves.
 */
describe("stated", () => {
  it("counts in the caller's own noun", () => {
    expect(stated(309, "shows")).toBe("309 shows");
    expect(stated(1, "book")).toBe("1 book");
  });

  it("formats the figure", () => {
    expect(stated(1539, "games")).toBe(`${format(1539)} games`);
  });

  it("says nothing of its own about zero, which is a real population", () => {
    expect(stated(0, "films")).toBe("0 films");
  });
});

describe("cut", () => {
  it("names both figures where a list shows fewer than it holds", () => {
    expect(cut(10, 300)).toBe("10 of 300");
    expect(cut(10, 1539)).toBe(`${format(10)} of ${format(1539)}`);
  });

  it("states the total alone where nothing is cut", () => {
    expect(cut(6, 6)).toBe("6");
    expect(cut(2000, 1539)).toBe(format(1539));
  });
});

describe("all", () => {
  it("words the whole list as the control that opens it", () => {
    expect(all(129)).toBe("All 129");
    expect(all(1539)).toBe(`All ${format(1539)}`);
  });
});
