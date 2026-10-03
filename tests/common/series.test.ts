import { describe, expect, it } from "vitest";
import { seriesLabel, seriesTile } from "../../src/common/series";

describe("seriesLabel", () => {
  it("states the place and the series, the series alone when unnumbered, and nothing for a standalone", () => {
    expect(seriesLabel({ series: "Revelation Space", seriesNumber: 2 })).toBe("#2 · Revelation Space");
    expect(seriesLabel({ series: "Revelation Space" })).toBe("Revelation Space");
    expect(seriesLabel({ series: "" })).toBe("");
  });

  it("states a fractional place as the sheet writes it", () => {
    // An entry slotted between two numbered ones reads as its own position, not the one before.
    expect(seriesLabel({ series: "Final Fantasy", seriesNumber: 7.1 })).toBe("#7.1 · Final Fantasy");
  });
});

describe("seriesTile", () => {
  it("names the series and carries its number, and stands only where there is a number", () => {
    expect(seriesTile({ series: "Mass Effect", seriesNumber: 3 })).toEqual({ label: "Mass Effect", value: "#3" });
    expect(seriesTile({ series: "Super Mario" })).toBeUndefined();
    expect(seriesTile({ series: "" })).toBeUndefined();
  });
});
