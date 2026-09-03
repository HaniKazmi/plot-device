import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { toOmniItems, type OmniItem } from "../../src/omnibus/adapter";
import { buildFranchiseUnion } from "../../src/omnibus/franchiseUnionData";
import { showSubject } from "../../src/show/cardData";
import { book } from "../fixtures/books";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

const TODAY = YearMonthDay.get(2025, 12, 31);

/** A hover card factory that records which items it was asked for, and renders nothing. */
const hoverCards = () => {
  const asked: OmniItem[] = [];
  const factory = (item: OmniItem) => {
    asked.push(item);
    return () => null;
  };
  return { asked, factory };
};

describe("buildFranchiseUnion", () => {
  it("groups every medium's entries under the raw franchise column", () => {
    const { factory } = hoverCards();
    const parent = show({ name: "Star Trek: Picard", franchise: "Star Trek" });
    parent.s = [season(parent, { startDate: YearMonthDay.get(2020, 1, 23), endDate: YearMonthDay.get(2020, 4, 1) })];

    const union = buildFranchiseUnion(
      library({
        games: [videoGame({ name: "Star Trek Online", franchise: "Star Trek" })],
        shows: [parent],
        movies: [movie({ name: "Star Trek", franchise: "Star Trek" })],
        books: [book({ name: "Dune", franchise: "Dune" })],
      }),
      TODAY,
      factory,
    );

    expect(union.get("Star Trek")?.map((entry) => entry.medium)).toEqual(["game", "show", "movie"]);
    // A standalone names itself in the column and is a group of one, which is the caller's to test.
    expect(union.get("Dune")).toHaveLength(1);
  });

  it("keys each entry exactly as the Omnibus keys the same item", () => {
    const { factory } = hoverCards();
    const lib = library({
      games: [videoGame({ franchise: "Zelda" })],
      movies: [movie({ name: "Zelda: The Movie", franchise: "Zelda" })],
      books: [book({ name: "Hyrule Historia", franchise: "Zelda" })],
    });

    const keys = buildFranchiseUnion(lib, TODAY, factory)
      .get("Zelda")!
      .map((entry) => entry.key);

    expect(keys).toEqual(toOmniItems(lib).map((item) => item.key));
  });

  it("makes every season of a show answer the show as its subject, under its own key", () => {
    const { factory } = hoverCards();
    const parent = show({ name: "Severance", franchise: "Severance" });
    // One at a time: the fixture numbers a season from the seasons its show already holds.
    parent.s = [season(parent, { startDate: YearMonthDay.get(2022, 2, 18), endDate: YearMonthDay.get(2022, 4, 8) })];
    parent.s.push(season(parent, { startDate: YearMonthDay.get(2025, 1, 17), endDate: YearMonthDay.get(2025, 3, 21) }));

    const entries = buildFranchiseUnion(library({ shows: [parent] }), TODAY, factory).get("Severance")!;

    expect(entries.map((entry) => entry.subject)).toEqual([showSubject(parent), showSubject(parent)]);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(2);
    expect(entries.map((entry) => entry.label)).toEqual(["Severance S1", "Severance S2"]);
  });

  it("draws a film as a point and an open game or book to today", () => {
    const { factory } = hoverCards();
    const watched = YearMonthDay.get(2013, 1, 4);
    const union = buildFranchiseUnion(
      library({
        games: [videoGame({ franchise: "Trek", startDate: YearMonthDay.get(2025, 6, 1), endDate: undefined })],
        movies: [movie({ franchise: "Trek", startDate: watched })],
        books: [book({ franchise: "Trek", startDate: YearMonthDay.get(2025, 9, 1), endDate: undefined })],
      }),
      TODAY,
      factory,
    );
    const [game, film, read] = union.get("Trek")!;

    expect(film.start).toBe(watched);
    expect(film.end).toBe(watched);
    expect(game.end).toBe(TODAY);
    expect(read.end).toBe(TODAY);
  });

  it("marks a year-only game imprecise and spans its whole year", () => {
    const { factory } = hoverCards();
    const [entry] = buildFranchiseUnion(
      library({ games: [videoGame({ franchise: "Old", startDate: Year.get(2007), endDate: Year.get(2007) })] }),
      TODAY,
      factory,
    ).get("Old")!;

    expect(entry.precise).toBe(false);
    expect(entry.start).toBe(YearMonthDay.get(2007, 1, 1));
    expect(entry.end).toBe(YearMonthDay.get(2007, 12, 31));
  });

  it("asks for one hover card per entry and wears the medium's fill", () => {
    const { asked, factory } = hoverCards();
    const union = buildFranchiseUnion(
      library({
        games: [videoGame({ franchise: "F" })],
        movies: [movie({ franchise: "F" })],
      }),
      TODAY,
      factory,
    );

    expect(asked).toHaveLength(2);
    const [game, film] = union.get("F")!;
    expect(game.fill).not.toEqual(film.fill);
  });
});
