import { describe, expect, it } from "vitest";
import { generateSunburstData, sunburstRoot } from "../../src/common/sunburstData";
import type { Colour } from "../../src/utils/types";

type Game = { name: string; company: string; platform: string; hours?: number };

const game = (overrides: Partial<Game> = {}): Game => ({
  name: "Breath of the Wild",
  company: "Nintendo",
  platform: "Switch",
  hours: 10,
  ...overrides,
});

const build = (data: Game[], groups: ("company" | "platform")[] = ["company", "platform"]) =>
  generateSunburstData(data, groups, {
    keyToVal: (item, key) => item[key],
    getCount: (item) => item.hours,
    getColor: () => "#d74840" as Colour,
    getLeafName: (item) => item.name,
  });

describe("the node tree", () => {
  it("builds one node per level plus a leaf, so depth follows the group count", () => {
    const entries = build([game()]);

    expect(entries.map((e) => e.id)).toEqual(["-Nintendo", "-Nintendo-Switch", "-Nintendo-Switch-Breath of the Wild"]);
  });

  it("names ids by their full path, so the same leaf under two parents stays distinct", () => {
    const entries = build([
      game({ name: "Tetris", company: "Nintendo", platform: "GB" }),
      game({ name: "Tetris", company: "Sega", platform: "MD" }),
    ]);

    const leaves = entries.filter((e) => e.name === "Tetris");
    expect(leaves.map((e) => e.id)).toEqual(["-Nintendo-GB-Tetris", "-Sega-MD-Tetris"]);
  });

  it("points each node at its parent, with the roots parented to the empty string", () => {
    const entries = build([game()]);

    expect(entries.find((e) => e.id === "-Nintendo")!.parent).toBe("");
    expect(entries.find((e) => e.id === "-Nintendo-Switch")!.parent).toBe("-Nintendo");
  });

  it("changes the ring layout when the caller re-nests the groups, with no other change", () => {
    const entries = build([game()], ["platform", "company"]);

    expect(entries.map((e) => e.id)).toEqual(["-Switch", "-Switch-Nintendo", "-Switch-Nintendo-Breath of the Wild"]);
  });

  it("produces a single ring plus leaves when given one group", () => {
    const entries = build([game()], ["company"]);

    expect(entries).toHaveLength(2);
  });
});

describe("value accumulation", () => {
  it("rolls every descendant's count up into its ancestors", () => {
    const entries = build([
      game({ name: "Zelda", platform: "Switch", hours: 10 }),
      game({ name: "Mario", platform: "Switch", hours: 5 }),
      game({ name: "Pikmin", platform: "GameCube", hours: 3 }),
    ]);

    const value = (id: string) => entries.find((e) => e.id === id)!.value;

    expect(value("-Nintendo")).toBe(18);
    expect(value("-Nintendo-Switch")).toBe(15);
    expect(value("-Nintendo-GameCube")).toBe(3);
  });

  it("merges duplicate leaves into one node rather than creating two", () => {
    const entries = build([game({ hours: 10 }), game({ hours: 5 })]);

    expect(entries.filter((e) => e.name === "Breath of the Wild")).toHaveLength(1);
    expect(entries.at(-1)!.value).toBe(15);
  });

  it("skips an item whose count is undefined, contributing nothing to any ancestor", () => {
    // A game with no logged hours must not create an empty wedge.
    const entries = build([game({ hours: 10 }), game({ name: "Untracked", hours: undefined })]);

    expect(entries.some((e) => e.name === "Untracked")).toBe(false);
    expect(entries.find((e) => e.id === "-Nintendo")!.value).toBe(10);
  });

  it("keeps a zero count, which is a real measurement rather than a missing one", () => {
    const entries = build([game({ hours: 0 })]);

    expect(entries.find((e) => e.id === "-Nintendo")!.value).toBe(0);
  });

  it("returns nothing for empty data", () => {
    expect(build([])).toEqual([]);
  });
});

describe("ordering", () => {
  it("sorts by id, so a parent always precedes its own children", () => {
    const entries = build([game({ company: "Sony", platform: "PS5" }), game({ company: "Nintendo" })]);
    const ids = entries.map((e) => e.id);

    expect(ids).toEqual([...ids].sort(new Intl.Collator().compare));
    expect(ids.indexOf("-Nintendo")).toBeLessThan(ids.indexOf("-Nintendo-Switch"));
  });
});

describe("the drawn root", () => {
  const library = [
    game({ name: "Zelda", company: "Nintendo", platform: "Switch" }),
    game({ name: "Pikmin", company: "Nintendo", platform: "GameCube" }),
    game({ name: "Bloodborne", company: "Sony", platform: "PS4" }),
  ];

  it("keeps a drilled id the data still holds", () => {
    expect(sunburstRoot(build(library), "-Nintendo-Switch")).toEqual({ id: "-Nintendo-Switch", atTop: false });
  });

  it("falls back to the top when re-nesting rebuilds the ids the drilled one was among", () => {
    // Grouping by platform first puts the Switch node at "-Switch", so "-Nintendo-Switch" names
    // nothing — the id an unresettable root would hand the chart.
    const renested = build(library, ["platform", "company"]);

    expect(sunburstRoot(renested, "-Nintendo-Switch")).toEqual({ id: "", atTop: true });
  });

  it("falls back to the top when a filter empties the drilled subtree", () => {
    const filtered = build(library.filter((item) => item.platform !== "Switch"));

    expect(sunburstRoot(filtered, "-Nintendo-Switch")).toEqual({ id: "", atTop: true });
  });

  it("reports a first-ring root as at the top, where the leaf ring is collapsed", () => {
    expect(sunburstRoot(build(library), "-Nintendo")).toEqual({ id: "-Nintendo", atTop: true });
  });

  it("reports the undrilled root as at the top, which no node in the data names", () => {
    expect(sunburstRoot(build(library), "")).toEqual({ id: "", atTop: true });
  });

  it("falls back to the top for every id when the data is empty", () => {
    expect(sunburstRoot(build([]), "-Nintendo")).toEqual({ id: "", atTop: true });
  });
});

describe("colour", () => {
  it("takes the colour from the first item that opens a node", () => {
    const entries = generateSunburstData([game()], ["company"], {
      keyToVal: (item, key) => item[key],
      getCount: (item) => item.hours,
      getColor: (item, firstGroup) => `${item[firstGroup]}-colour` as Colour,
      getLeafName: (item) => item.name,
    });

    expect(entries.every((e) => e.color === "Nintendo-colour")).toBe(true);
  });
});
