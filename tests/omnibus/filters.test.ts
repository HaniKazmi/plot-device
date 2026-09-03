import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { toOmniItems, type OmniItem } from "../../src/omnibus/adapter";
import { filters, initialState, type FilterState } from "../../src/omnibus/filterUtils";
import { book } from "../fixtures/books";
import { movie } from "../fixtures/movies";
import { videoGame } from "../fixtures/vgRows";

const state = (overrides: Partial<FilterState> = {}): Omit<FilterState, "filter"> => ({
  ...initialState,
  ...overrides,
});

/** One item per medium, built through the adapter so the tests filter what the page filters. */
const [game, film] = toOmniItems({ games: [videoGame()], shows: [], movies: [movie()], books: [] });

const inYear = (year: number, overrides: Partial<OmniItem> = {}): OmniItem => ({
  ...toOmniItems({ games: [], shows: [], movies: [movie({ startDate: YearMonthDay.get(year, 6, 1) })], books: [] })[0],
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

describe("guest mode", () => {
  it("pushes no predicate here, because it is applied to each library before the union", () => {
    // A union-level predicate would hide an item from the charts while the Now band, which elects
    // from the domain records, went on headlining it.
    const keep = filters(state({ guestMode: true }));

    expect(keep(game)).toBe(true);
    expect(keep(film)).toBe(true);
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
      games: [videoGame({ startDate: YearMonthDay.get(2019, 12, 20), endDate: YearMonthDay.get(2020, 1, 8) })],
      shows: [],
      movies: [],
      books: [],
    });
    const keep = filters(state({ yearType: "matching", yearTo: 2020 as YearNumber }));

    expect(keep(crossing)).toBe(true);
  });
});

describe("the books switch", () => {
  it("removes books from the page the way the other three switches remove their media", () => {
    const [read] = toOmniItems({ games: [], shows: [], movies: [], books: [book()] });

    expect(filters(state({ book: false }))(read)).toBe(false);
    expect(filters(state({ book: false }))(film)).toBe(true);
    expect(filters(state())(read)).toBe(true);
  });
});
