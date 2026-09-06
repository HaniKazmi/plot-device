import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, Year, YearMonthDay, type YearNumber } from "../../src/common/date";
import { guestFilter } from "../../src/game/filters";
import { filters, initialState, type FilterState } from "../../src/game/filterUtils";
import { videoGame } from "../fixtures/gameRows";
import { gameFilters } from "../../src/game/filters";

const state = (overrides: Partial<FilterState> = {}): Omit<FilterState, "filter"> => ({
  ...initialState,
  ...overrides,
});

describe("the default state", () => {
  it("hides nothing, so the tab opens showing every game", () => {
    const keep = filters(state());

    expect(keep(videoGame({ status: "Endless" }))).toBe(true);
    expect(keep(videoGame({ franchise: "Pokémon" }))).toBe(true);
    expect(keep(videoGame({ platform: "Nintendo Wii" }))).toBe(true);
  });
});

describe("the boolean toggles are inclusive", () => {
  it("hides Endless games only once the toggle is turned off", () => {
    // `endless: true` means "show them" — the predicate exists only in the false case.
    expect(filters(state({ endless: true }))(videoGame({ status: "Endless" }))).toBe(true);
    expect(filters(state({ endless: false }))(videoGame({ status: "Endless" }))).toBe(false);
    expect(filters(state({ endless: false }))(videoGame({ status: "Beat" }))).toBe(true);
  });

  it("also hides party games when Endless is off, because they were folded into Endless", () => {
    const party = videoGame({ status: "Endless", party: true });

    expect(filters(state({ endless: false }))(party)).toBe(false);
  });

  it("hides the Pokémon franchise by exact accented name", () => {
    expect(filters(state({ pokemon: false }))(videoGame({ franchise: "Pokémon" }))).toBe(false);
    expect(filters(state({ pokemon: false }))(videoGame({ franchise: "Pokemon" }))).toBe(true);
  });
});

describe("the unconfirmed-playtime filter", () => {
  const keep = filters(state({ unconfirmed: false }));

  it("keeps the platforms that report playtime themselves", () => {
    const trusted = ["Nintendo Switch", "Nintendo Switch 2", "Nintendo 3DS", "PlayStation 4", "PlayStation 5"] as const;

    for (const platform of trusted) {
      expect(keep(videoGame({ platform }))).toBe(true);
    }
  });

  it("drops older consoles, which never tracked hours", () => {
    expect(keep(videoGame({ platform: "Nintendo Wii" }))).toBe(false);
    expect(keep(videoGame({ platform: "Xbox 360" }))).toBe(false);
  });

  it("keeps PC only from 2015, when the logging became trustworthy", () => {
    expect(keep(videoGame({ platform: "PC", startDate: YearMonthDay.get(2015, 1, 1) }))).toBe(true);
    expect(keep(videoGame({ platform: "PC", startDate: YearMonthDay.get(2014, 12, 31) }))).toBe(false);
  });

  it("drops a PC game logged with only a year, since the cutoff cannot be checked", () => {
    expect(keep(videoGame({ platform: "PC", startDate: Year.get(2020) }))).toBe(false);
  });
});

describe("the multi-select categories", () => {
  it("is inactive while its list is empty", () => {
    expect(filters(state({ franchise: [] }))(videoGame({ franchise: "Zelda" }))).toBe(true);
  });

  it("keeps only members of a non-empty list", () => {
    const keep = filters(state({ franchise: ["Zelda", "Mario"] }));

    expect(keep(videoGame({ franchise: "Zelda" }))).toBe(true);
    expect(keep(videoGame({ franchise: "Metroid" }))).toBe(false);
  });

  it("combines categories conjunctively, narrowing rather than widening", () => {
    const keep = filters(state({ franchise: ["Zelda"], gameplay: ["Puzzle"] }));

    expect(keep(videoGame({ franchise: "Zelda", gameplay: "Puzzle" }))).toBe(true);
    expect(keep(videoGame({ franchise: "Zelda", gameplay: "Action Adventure" }))).toBe(false);
  });

  it("narrows on genre and gameplay independently, since one game carries both", () => {
    // The two columns describe different things — what a game is about, and how it is played — so
    // selecting one of each has to keep only the games answering both.
    const keep = filters(state({ genre: ["Fantasy"], gameplay: ["Role Playing"] }));

    expect(keep(videoGame({ genre: "Fantasy", gameplay: "Role Playing" }))).toBe(true);
    expect(keep(videoGame({ genre: "Fantasy", gameplay: "Puzzle" }))).toBe(false);
    expect(keep(videoGame({ genre: "Horror", gameplay: "Role Playing" }))).toBe(false);
  });
});

describe("the year cutoff", () => {
  it("is inactive when the ceiling is the current year, which is what the default means", () => {
    const keep = filters(state({ yearType: "upto", yearTo: CURRENT_YEAR }));

    expect(keep(videoGame({ startDate: YearMonthDay.get(2017, 3, 3) }))).toBe(true);
  });

  it("keeps everything up to an earlier ceiling", () => {
    const ceiling = (CURRENT_YEAR - 1) as YearNumber;
    const keep = filters(state({ yearType: "upto", yearTo: ceiling }));

    expect(keep(videoGame({ startDate: YearMonthDay.get(ceiling, 6, 1) }))).toBe(true);
    expect(keep(videoGame({ startDate: YearMonthDay.get(CURRENT_YEAR, 6, 1) }))).toBe(false);
  });

  it("matches a single year exactly", () => {
    const keep = filters(state({ yearType: "matching", yearTo: 2017 as YearNumber }));

    expect(keep(videoGame({ startDate: YearMonthDay.get(2017, 3, 3) }))).toBe(true);
    expect(keep(videoGame({ startDate: YearMonthDay.get(2016, 3, 3) }))).toBe(false);
  });
});

describe("what guest mode hides", () => {
  // The rule is applied to the library above the tab rather than through these filters, so it is
  // exercised as the predicate itself: the page's own filters never see an adult-themed game.
  it("keeps everything but a game themed adult", () => {
    expect(guestFilter(videoGame({ themes: ["Adult", "Fantasy"] }))).toBe(false);
    expect(guestFilter(videoGame({ themes: ["Fantasy"] }))).toBe(true);
  });

  it("matches the theme exactly rather than by substring", () => {
    expect(guestFilter(videoGame({ themes: ["Adulthood"] }))).toBe(true);
  });
});

describe("the schema the drawer and the box are both drawn from", () => {
  it("offers three toggles and five categories, in the order they are laid out", () => {
    expect(gameFilters.toggles.map((toggle) => toggle.key)).toEqual(["endless", "unconfirmed", "pokemon"]);
    expect(gameFilters.categories.map((category) => category.key)).toEqual([
      "platform",
      "genre",
      "gameplay",
      "publisher",
      "franchise",
    ]);
  });

  it("opens a search-within on the vocabularies this library holds hundreds of values in", () => {
    // A reader picks a franchise or a person by typing; a genre or a format by scanning a list
    // short enough to read. The flag is what tells the two apart, and the search box's This page
    // mode reads it, offering a long category as a list to search rather than one to scan.
    expect(gameFilters.categories.filter((category) => category.searchable).map((category) => category.key)).toEqual([
      "publisher",
      "franchise",
    ]);
  });
});
