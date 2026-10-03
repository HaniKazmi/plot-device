import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { bySeriesThenRelease } from "../../src/book/drilldown";
import { book } from "../fixtures/books";

describe("bySeriesThenRelease", () => {
  it("reads each series through in the order it was published, whatever the series numbers it", () => {
    // Narnia numbers The Magician's Nephew first, by story; it was published sixth.
    const lion = book({
      name: "The Lion, the Witch and the Wardrobe",
      series: "Chronicles of Narnia",
      seriesNumber: 2,
      releaseDate: YearMonthDay.get(1950, 10, 16),
    });
    const nephew = book({
      name: "The Magician's Nephew",
      series: "Chronicles of Narnia",
      seriesNumber: 1,
      releaseDate: YearMonthDay.get(1955, 5, 2),
    });
    const space = book({
      name: "Revelation Space",
      series: "Revelation Space",
      seriesNumber: 1,
      releaseDate: YearMonthDay.get(2000, 3, 1),
    });

    expect([nephew, space, lion].toSorted(bySeriesThenRelease).map((each) => each.name)).toEqual([
      "The Lion, the Witch and the Wardrobe",
      "The Magician's Nephew",
      "Revelation Space",
    ]);
  });

  it("puts standalones after every series", () => {
    const standalone = book({ name: "Project Hail Mary", series: "", releaseDate: YearMonthDay.get(2021, 5, 4) });
    const series = book({
      name: "Revelation Space",
      series: "Revelation Space",
      releaseDate: YearMonthDay.get(2000, 3, 1),
    });

    expect([standalone, series].toSorted(bySeriesThenRelease).map((each) => each.name)).toEqual([
      "Revelation Space",
      "Project Hail Mary",
    ]);
  });
});
