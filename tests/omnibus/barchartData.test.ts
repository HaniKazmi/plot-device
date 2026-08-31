import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { toOmniItems, type Library } from "../../src/omnibus/adapter";
import { omniBarchartRows } from "../../src/omnibus/barchartData";
import { mediumToColour } from "../../src/omnibus/types";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

const library = (overrides: Partial<Library> = {}): Library => ({ games: [], shows: [], movies: [], ...overrides });

const showWith = (start: number, end: number, minutes: number) => {
  const parent = show({ startDate: YearMonthDay.get(start, 3, 1) });
  parent.s = [
    season(parent, { startDate: YearMonthDay.get(start, 3, 1), endDate: YearMonthDay.get(end, 6, 1), minutes }),
  ];
  return parent;
};

describe("omniBarchartRows", () => {
  it("names each series by its medium and colours it by the tab's one vocabulary", () => {
    const rows = omniBarchartRows(
      toOmniItems(
        library({
          games: [videoGame()],
          shows: [showWith(2022, 2022, 405)],
          movies: [movie()],
        }),
      ),
      "Items",
    );

    expect(rows.map((row) => row.name)).toEqual(["Games", "Shows", "Movies"]);
    expect(rows.map((row) => row.colour)).toEqual([
      mediumToColour("game"),
      mediumToColour("show"),
      mediumToColour("movie"),
    ]);
  });

  it("dates a row by the attribution year, not by when the item was started", () => {
    const rows = omniBarchartRows(
      toOmniItems(
        library({
          games: [videoGame({ startDate: YearMonthDay.get(2019, 12, 20), endDate: YearMonthDay.get(2020, 1, 8) })],
        }),
      ),
      "Items",
    );

    expect(rows[0].date).toBe(Year.get(2020));
  });

  it("keeps a whole year in every view, since two of the three media hold no finer date", () => {
    const items = toOmniItems(library({ movies: [movie({ startDate: YearMonthDay.get(2021, 5, 9) })] }));

    expect(omniBarchartRows(items, "Hours")[0].date).toBe(Year.get(2021));
  });

  it("counts one per item under Items, whatever the item cost in hours", () => {
    const rows = omniBarchartRows(
      toOmniItems(library({ games: [videoGame({ hours: 120 })], movies: [movie({ minutes: 96 })] })),
      "Items",
    );

    expect(rows.map((row) => row.value)).toEqual([1, 1]);
  });

  it("carries exact hours under Hours, so the share view divides values and not floors", () => {
    // 96 minutes is 1.6 hours. Flooring here would make the film's share of a year a third of
    // what it is, and would drop every film under an hour from the chart entirely.
    const rows = omniBarchartRows(toOmniItems(library({ movies: [movie({ minutes: 96 })] })), "Hours");

    expect(rows[0].value).toBeCloseTo(1.6);
  });
});
