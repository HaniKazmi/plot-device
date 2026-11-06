import { describe, expect, it } from "vitest";
import { seriesPlace, seriesRow, stripPlace } from "../../src/common/series";

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

describe("seriesPlace", () => {
  it("states the number alone where the series and the franchise are one name", () => {
    expect(seriesPlace({ series: "Mass Effect", seriesNumber: 3 }, "Mass Effect")).toBe("#3");
  });

  it("names a series apart from the franchise it sits inside, in the ledger row's words", () => {
    expect(seriesPlace({ series: "Rain Wild Chronicles", seriesNumber: 1 }, "Realm of the Elderlings")).toBe(
      "#1 · Rain Wild Chronicles",
    );
  });

  it("states nothing for an unnumbered entry or a standalone", () => {
    expect(seriesPlace({ series: "Super Mario" }, "Mario")).toBeUndefined();
    expect(seriesPlace({ series: "" }, "Arrival")).toBeUndefined();
  });
});

describe("stripPlace", () => {
  const book = { series: "Rain Wild Chronicles", seriesNumber: 1 };

  it("states the place on a hero's strip", () => {
    expect(stripPlace(true, book, "Realm of the Elderlings")).toBe("#1 · Rain Wild Chronicles");
  });

  it("states nothing on an expanded card's strip, whose ledger already has a Series row", () => {
    expect(stripPlace(false, book, "Realm of the Elderlings")).toBeUndefined();
  });

  it("states nothing where the strip is handed no series", () => {
    expect(stripPlace(true, undefined, "Avatar")).toBeUndefined();
  });
});
