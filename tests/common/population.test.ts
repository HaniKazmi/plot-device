import { describe, expect, it } from "vitest";
import { all, cut, isFilteredEmpty, narrowedTo, stated } from "../../src/common/population";
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

describe("narrowedTo", () => {
  it("seats the population beside the count of choices that made it", () => {
    expect(narrowedTo(stated(190, "shows"), 2)).toBe("190 shows · 2 filters");
  });

  it("says one filter in the singular", () => {
    expect(narrowedTo(stated(190, "shows"), 1)).toBe("190 shows · 1 filter");
  });

  it("states the population alone where nothing narrows it", () => {
    expect(narrowedTo(stated(309, "shows"), 0)).toBe("309 shows");
  });
});

describe("isFilteredEmpty", () => {
  it("is true only where a filter has left nothing", () => {
    expect(isFilteredEmpty(0, 2)).toBe(true);
  });

  it("is false for an empty library with no filters set", () => {
    expect(isFilteredEmpty(0, 0)).toBe(false);
  });

  it("is false wherever the count is not zero, however many filters are active", () => {
    expect(isFilteredEmpty(1, 2)).toBe(false);
  });
});
