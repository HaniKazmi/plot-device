import { describe, expect, it } from "vitest";
import { seriesRow, seriesTile } from "../../src/common/series";

describe("seriesRow", () => {
  it("states the place and the series, the series alone when unnumbered, and nothing for a standalone", () => {
    expect(seriesRow({ series: "Revelation Space", seriesNumber: 2 })).toEqual({
      label: "Series",
      value: "#2 · Revelation Space",
    });
    expect(seriesRow({ series: "Revelation Space" })?.value).toBe("Revelation Space");
    expect(seriesRow({ series: "" })).toBeUndefined();
  });

  it("states a fractional place as the sheet writes it", () => {
    // An entry slotted between two numbered ones reads as its own position, not the one before.
    expect(seriesRow({ series: "Final Fantasy", seriesNumber: 7.1 })?.value).toBe("#7.1 · Final Fantasy");
  });
});

describe("seriesTile", () => {
  it("names the series and carries its number, and stands only where there is a number", () => {
    expect(seriesTile({ series: "Mass Effect", seriesNumber: 3 })).toEqual({ label: "Mass Effect", value: "#3" });
    expect(seriesTile({ series: "Super Mario" })).toBeUndefined();
    expect(seriesTile({ series: "" })).toBeUndefined();
  });

  it('reads "In series" where a tile beside it already names the same franchise', () => {
    expect(seriesTile({ series: "Knives Out", seriesNumber: 3 }, "Knives Out")).toEqual({
      label: "In series",
      value: "#3",
    });
    expect(seriesTile({ series: "Iron Man", seriesNumber: 2 }, "Marvel")?.label).toBe("Iron Man");
  });
});
