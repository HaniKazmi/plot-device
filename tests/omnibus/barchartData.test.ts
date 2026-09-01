import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { toOmniItems, type Library } from "../../src/omnibus/adapter";
import { omniBarchartRows } from "../../src/omnibus/barchartData";
import { mediumToColour } from "../../src/omnibus/types";
import type { Genre } from "../../src/vg/types";
import { ageRatingToColour, genreToColour } from "../../src/utils/types";
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
      "medium",
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
      "medium",
    );

    expect(rows[0].date).toBe(Year.get(2020));
  });

  it("keeps a whole year in every view, since two of the three media hold no finer date", () => {
    const items = toOmniItems(library({ movies: [movie({ startDate: YearMonthDay.get(2021, 5, 9) })] }));

    expect(omniBarchartRows(items, "Hours", "medium")[0].date).toBe(Year.get(2021));
  });

  it("counts one per item under Items, whatever the item cost in hours", () => {
    const rows = omniBarchartRows(
      toOmniItems(library({ games: [videoGame({ hours: 120 })], movies: [movie({ minutes: 96 })] })),
      "Items",
      "medium",
    );

    expect(rows.map((row) => row.value)).toEqual([1, 1]);
  });

  it("carries exact hours under Hours, so the share view divides values and not floors", () => {
    // 96 minutes is 1.6 hours. Flooring here would make the film's share of a year a third of
    // what it is, and would drop every film under an hour from the chart entirely.
    const rows = omniBarchartRows(toOmniItems(library({ movies: [movie({ minutes: 96 })] })), "Hours", "medium");

    expect(rows[0].value).toBeCloseTo(1.6);
  });

  it("splits by genre in the ramp the rest of the page paints genres with", () => {
    // A genre is a shelf in the gallery and a row in the genres band; a third hue for it on the
    // chart would teach a legend neither of those honours.
    const rows = omniBarchartRows(
      toOmniItems(library({ games: [videoGame({ genre: "Action" })], movies: [movie({ genre: "Action" })] })),
      "Items",
      "genre",
    );

    expect(rows.map((row) => row.name)).toEqual(["Action", "Action"]);
    expect(new Set(rows.map((row) => row.colour)).size).toBe(1);
    expect(rows[0].colour).toBe(genreToColour("Action"));
  });

  it("splits by the age band, so one tier is not two series in two notations", () => {
    // Games record PEGI and the other two BBFC. Splitting on the raw certificate would draw a
    // PEGI 16 game and the BBFC 15 film beside it as two series in the same colour.
    const rows = omniBarchartRows(
      toOmniItems(library({ games: [videoGame({ rating: "16+" })], movies: [movie({ rating: "15" })] })),
      "Items",
      "rating",
    );

    expect(rows.map((row) => row.name)).toEqual(["15/16", "15/16"]);
    expect(rows[0].colour).toBe(ageRatingToColour("15"));
  });

  it("drops a row whose split column is empty rather than opening a nameless series", () => {
    // The legend and the tooltip both render "" as a blank, so an unnamed series is a colour with
    // nothing saying what it is.
    // Cast because the sheet can hold a row part way through being filled in, which the domain
    // type does not describe — the guard exists for exactly the value the type says cannot occur.
    const items = toOmniItems(library({ games: [videoGame({ genre: "" as Genre }), videoGame({ genre: "Action" })] }));

    expect(omniBarchartRows(items, "Items", "genre").map((row) => row.name)).toEqual(["Action"]);
  });

  it("leaves the medium split unable to be empty, since every item carries one", () => {
    const items = toOmniItems(library({ games: [videoGame({ genre: "" as Genre })] }));

    expect(omniBarchartRows(items, "Items", "medium")).toHaveLength(1);
  });
});
