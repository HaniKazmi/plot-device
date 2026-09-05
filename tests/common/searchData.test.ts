import { describe, expect, it } from "vitest";
import { foldText, rankHits, type Searchable } from "../../src/common/searchData";

const entry = (name: string, overrides: Partial<Searchable> = {}): Searchable => ({
  name,
  secondary: [],
  size: 1,
  ...overrides,
});

const names = (entries: Searchable[], query: string, limit = 10) =>
  rankHits(entries, query, limit).hits.map((hit) => hit.entry.name);

describe("foldText", () => {
  it("drops accents and case", () => {
    expect(foldText("Pokémon")).toBe("pokemon");
  });

  it("turns any run of punctuation and spaces into one space, so a colon reads as a word break", () => {
    expect(foldText("Star Trek: Strange New Worlds")).toBe("star trek strange new worlds");
    expect(foldText("Assassin's Creed")).toBe("assassin s creed");
    expect(foldText("  star   trek ")).toBe("star trek");
  });
});

describe("rankHits", () => {
  it("answers nothing to an empty query", () => {
    expect(rankHits([entry("Zelda")], "   ", 5)).toEqual({ hits: [], total: 0 });
  });

  it("finds a name through its accent", () => {
    expect(names([entry("Pokémon")], "pokemon")).toEqual(["Pokémon"]);
  });

  it("ranks an exact name over a word start over a secondary word start over a substring", () => {
    const entries = [
      entry("Starfield"),
      entry("A Star Is Born"),
      entry("Star"),
      entry("Superstar"),
      entry("Ad Astra", { secondary: ["Star Studios"] }),
    ];

    expect(names(entries, "star")).toEqual(["Star", "A Star Is Born", "Starfield", "Ad Astra", "Superstar"]);
  });

  it("breaks a tie on size, larger first, then on the name", () => {
    const entries = [
      entry("Star Wars", { size: 20 }),
      entry("Star Trek", { size: 24 }),
      entry("Star Fox", { size: 20 }),
    ];

    expect(names(entries, "star")).toEqual(["Star Trek", "Star Fox", "Star Wars"]);
  });

  it("states the run of the raw name the phrase matched, at a word start where one exists", () => {
    const [hit] = rankHits([entry("Martha's Art Class")], "art", 5).hits;

    expect(hit.matched).toEqual([9, 12]);
  });

  it("finds a phrase across punctuation in the name and underlines it as written", () => {
    const [hit] = rankHits([entry("Star Trek: Strange New Worlds")], "trek strange", 5).hits;

    expect(hit.matched).toEqual([5, 18]);
    expect(
      rankHits([entry("Star Trek: Strange New Worlds")], "star trek: strange new worlds", 5).hits[0].matched,
    ).toEqual([0, 29]);
  });

  it("underlines the right run past a character that takes two code units", () => {
    const [hit] = rankHits([entry("🎮 Mega Man")], "man", 5).hits;

    expect("🎮 Mega Man".slice(...hit.matched!)).toBe("Man");
  });

  it("states no run for a hit on secondary text alone", () => {
    const [hit] = rankHits([entry("Arrival", { secondary: ["Denis Villeneuve"] })], "villeneuve", 5).hits;

    expect(hit.matched).toBeUndefined();
  });

  it("finds every word of a query across the name and secondary text when the phrase is absent", () => {
    const entries = [entry("Star Trek: Strange New Worlds", { secondary: ["Paramount+"] }), entry("Strange Days")];

    expect(names(entries, "trek worlds")).toEqual(["Star Trek: Strange New Worlds"]);
  });

  it("cuts to the limit and counts the whole answer", () => {
    const entries = ["Star A", "Star B", "Star C", "Star D", "Star E", "Star F", "Star G"].map((name) => entry(name));
    const { hits, total } = rankHits(entries, "star", 5);

    expect(hits).toHaveLength(5);
    expect(total).toBe(7);
  });

  it("returns the caller's own entries, so a raw key travels through unfolded", () => {
    const original = entry("Pokémon", { size: 3 });

    expect(rankHits([original], "poke", 5).hits[0].entry).toBe(original);
  });
});
