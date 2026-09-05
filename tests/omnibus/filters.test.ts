import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { toOmniItems } from "../../src/app/library";
import type { OmniItem } from "../../src/common/medium";
import { filters, initialState, type FilterState } from "../../src/omnibus/filterUtils";
import { book } from "../fixtures/books";
import { movie } from "../fixtures/movies";
import { videoGame } from "../fixtures/vgRows";
import { omniFilters } from "../../src/omnibus/filters";
import { media } from "../../src/app/types";

const state = (overrides: Partial<FilterState> = {}): Omit<FilterState, "filter"> => ({
  ...initialState,
  ...overrides,
});

/** One item per medium, built through the adapter so the tests filter what the page filters. */
const [game, film] = toOmniItems({ game: [videoGame()], show: [], movie: [movie()], book: [] });

const inYear = (year: number, overrides: Partial<OmniItem> = {}): OmniItem => ({
  ...toOmniItems({ game: [], show: [], movie: [movie({ startDate: YearMonthDay.get(year, 6, 1) })], book: [] })[0],
  ...overrides,
});

describe("the default state", () => {
  it("is a no-op: all three media are on, the year ceiling is the current year", () => {
    const keep = filters(state());

    expect(keep(game)).toBe(true);
    expect(keep(film)).toBe(true);
  });

  it("measures in hours, the only unit the three media are comparable in", () => {
    expect(initialState.measure).toBe("Hours");
  });
});

describe("the medium toggles", () => {
  it("drops a medium that has been switched off", () => {
    const keep = filters(state({ game: false }));

    expect(keep(game)).toBe(false);
    expect(keep(film)).toBe(true);
  });

  it("keeps only the media still switched on", () => {
    const keep = filters(state({ game: false, movie: false }));

    expect(keep(game)).toBe(false);
    expect(keep(film)).toBe(false);
  });

  it("keeps nothing at all when every medium is off, one rule per switch composing to the empty page", () => {
    const keep = filters(state({ game: false, show: false, movie: false, book: false }));

    expect(keep(game)).toBe(false);
    expect(keep(film)).toBe(false);
  });

  it("keeps everything when all three are on, without a predicate to walk", () => {
    expect(filters(state({ game: true, show: true, movie: true }))(game)).toBe(true);
  });
});

describe("categories", () => {
  it("filters by genre and franchise across the media at once", () => {
    // The vocabularies are shared, which is the whole point of the selects on this tab: picking a
    // genre asks all three libraries the same question.
    expect(filters(state({ genre: [film.genre] }))(film)).toBe(true);
    expect(filters(state({ genre: [film.genre] }))(game)).toBe(false);

    expect(filters(state({ franchise: [game.franchise] }))(game)).toBe(true);
    expect(filters(state({ franchise: [game.franchise] }))(film)).toBe(false);
  });
});

describe("the year cutoff", () => {
  it("matches the attribution year exactly under 'matching'", () => {
    const keep = filters(state({ yearType: "matching", yearTo: 2022 as YearNumber }));

    expect(keep(inYear(2022))).toBe(true);
    expect(keep(inYear(2021))).toBe(false);
  });

  it("applies an earlier ceiling to the attribution year under 'upto'", () => {
    const ceiling = (CURRENT_YEAR - 1) as YearNumber;
    const keep = filters(state({ yearType: "upto", yearTo: ceiling }));

    expect(keep(inYear(ceiling))).toBe(true);
    expect(keep(inYear(CURRENT_YEAR))).toBe(false);
  });

  it("is a no-op at the current year, the ceiling that means no ceiling", () => {
    expect(filters(state({ yearType: "upto", yearTo: CURRENT_YEAR }))(inYear(CURRENT_YEAR))).toBe(true);
  });

  it("reads the year a game was finished rather than the year it was started", () => {
    // What the accessor handed to the shared `yearPredicates` buys: a game played across a new
    // year answers the filter with the year its hours landed in, not the year it was started.
    const [crossing] = toOmniItems({
      game: [videoGame({ startDate: YearMonthDay.get(2019, 12, 20), endDate: YearMonthDay.get(2020, 1, 8) })],
      show: [],
      movie: [],
      book: [],
    });
    const keep = filters(state({ yearType: "matching", yearTo: 2020 as YearNumber }));

    expect(keep(crossing)).toBe(true);
  });
});

describe("the books switch", () => {
  it("removes books from the page the way the other three switches remove their media", () => {
    const [read] = toOmniItems({ game: [], show: [], movie: [], book: [book()] });

    expect(filters(state({ book: false }))(read)).toBe(false);
    expect(filters(state({ book: false }))(film)).toBe(true);
    expect(filters(state())(read)).toBe(true);
  });
});

describe("the schema the drawer and the box are both drawn from", () => {
  it("offers a switch per medium and the two vocabularies all four share", () => {
    expect(omniFilters.toggles.map((toggle) => toggle.key)).toEqual([...media]);
    expect(omniFilters.categories.map((category) => category.key)).toEqual(["genre", "franchise"]);
  });

  it("opens a search-within on the vocabularies this library holds hundreds of values in", () => {
    // A reader picks a franchise or a person by typing; a genre or a format by scanning a list
    // short enough to read. The flag is what tells the two apart, and B8's box reads it.
    expect(omniFilters.categories.filter((category) => category.searchable).map((category) => category.key)).toEqual([
      "franchise",
    ]);
  });
});
