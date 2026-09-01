import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { toOmniItems, type Library } from "../../src/omnibus/adapter";
import { genreBridge } from "../../src/omnibus/genreBridgeData";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

const library = (overrides: Partial<Library> = {}): Library => ({ games: [], shows: [], movies: [], ...overrides });

const showWith = (genre: string, minutes: number) => {
  const parent = show({ genre });
  parent.s = [season(parent, { endDate: YearMonthDay.get(2022, 6, 1), minutes })];
  return parent;
};

describe("genreBridge", () => {
  it("names each row by its genre, which is what the card looks its colour up by", () => {
    const rows = genreBridge(
      toOmniItems(
        library({
          games: [videoGame({ genre: "Horror" })],
          movies: [movie({ genre: "Sci-Fi" }), movie({ genre: "Sci-Fi" })],
          shows: [showWith("Sci-Fi", 405)],
        }),
      ),
    );

    expect(rows.map((row) => row.genre)).toEqual(["Sci-Fi"]);
  });

  it("bridges a game to a film under one genre, which is the whole claim a row makes", () => {
    // All three sheets record the same genre vocabulary, so a genre meets itself with no mapping
    // in between. A games-only vocabulary would make every game genre a single-medium row and
    // this chart would hold nothing but shows and films.
    const rows = genreBridge(
      toOmniItems(
        library({
          games: [videoGame({ genre: "Fantasy", hours: 40 })],
          movies: [movie({ genre: "Fantasy", minutes: 120 })],
        }),
      ),
    );

    expect(rows.map((row) => row.genre)).toEqual(["Fantasy"]);
    expect(rows[0].segments.map((segment) => segment.medium)).toEqual(["game", "movie"]);
  });

  it("drops Other, because an unrecorded genre is not a genre two media share", () => {
    // The Games converter defaults a blank cell to "Other"; the Movies one drops the row and Shows
    // always fills the column, so "Other" can only ever be games. The single-medium filter is what
    // keeps it off the chart — a row there would claim the media meet somewhere none of them names.
    const rows = genreBridge(
      toOmniItems(
        library({
          games: [videoGame({ genre: "Other", hours: 40 }), videoGame({ genre: "Other", hours: 20 })],
          movies: [movie({ genre: "Fantasy", minutes: 120 })],
          shows: [showWith("Fantasy", 405)],
        }),
      ),
    );

    expect(rows.map((row) => row.genre)).toEqual(["Fantasy"]);
  });

  it("names each medium's slice in the page's order, and only where it logged hours", () => {
    const rows = genreBridge(
      toOmniItems(
        library({
          // A game logged with no hours records the genre but contributes nothing to spend, and a
          // slice floored to half a percent would claim it did.
          games: [videoGame({ genre: "Action", hours: 0 })],
          movies: [movie({ genre: "Action", minutes: 120 })],
          shows: [showWith("Action", 600)],
        }),
      ),
    );

    expect(rows[0].segments.map((segment) => segment.medium)).toEqual(["show", "movie"]);
  });

  it("splits a genre's hours into shares that fill the bar exactly", () => {
    const rows = genreBridge(
      toOmniItems(
        library({
          movies: [movie({ genre: "Sci-Fi", minutes: 180 })],
          shows: [showWith("Sci-Fi", 540)],
        }),
      ),
    );

    expect(rows[0].segments.sum("percent")).toBeCloseTo(100);
    expect(rows[0].segments.map((segment) => Math.round(segment.percent))).toEqual([75, 25]);
  });

  it("floors the genre's hours once rather than once per medium", () => {
    // 96 and 96 minutes is 3.2 hours between them. Flooring each medium first answers 2.
    const rows = genreBridge(
      toOmniItems(
        library({
          movies: [movie({ genre: "Sci-Fi", minutes: 96 })],
          shows: [showWith("Sci-Fi", 96)],
        }),
      ),
    );

    expect(rows[0].hours).toBe(3);
  });

  it("leads with the genre the most hours went into", () => {
    const rows = genreBridge(
      toOmniItems(
        library({
          movies: [movie({ genre: "Sci-Fi", minutes: 120 }), movie({ genre: "Horror", minutes: 90 })],
          shows: [showWith("Sci-Fi", 3000), showWith("Horror", 300)],
        }),
      ),
    );

    expect(rows.map((row) => row.genre)).toEqual(["Sci-Fi", "Horror"]);
  });

  it("colours a row from the ramp the tabs already speak that genre in", () => {
    const rows = genreBridge(
      toOmniItems(
        library({
          movies: [movie({ genre: "Sci-Fi" })],
          shows: [showWith("Sci-Fi", 405)],
        }),
      ),
    );

    expect(rows[0].genre).toBe("Sci-Fi");
  });
});
