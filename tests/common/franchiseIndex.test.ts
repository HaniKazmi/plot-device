import { describe, expect, it } from "vitest";
import { franchiseIndex } from "../../src/common/franchiseIndex";

type Item = { name: string; franchise: string };

const item = (name: string, franchise: string): Item => ({ name, franchise });
const byFranchise = (entry: Item) => entry.franchise;

describe("franchiseIndex", () => {
  it("groups items under the franchise the accessor names", () => {
    const index = franchiseIndex([item("a", "Zelda"), item("b", "Zelda"), item("c", "Mario")], byFranchise);

    expect(index.get("Zelda")?.map((entry) => entry.name)).toEqual(["a", "b"]);
    expect(index.get("Mario")?.map((entry) => entry.name)).toEqual(["c"]);
  });

  it("skips items the accessor answers the empty string for", () => {
    // The empty franchise is a sheet's "no series" — grouping on it would hand every
    // unaffiliated item a strip several hundred bands deep.
    const index = franchiseIndex([item("standalone", ""), item("a", "Zelda")], byFranchise);

    expect(index.has("")).toBe(false);
    expect(index.size).toBe(1);
  });

  it("lets the accessor erase a franchise that merely repeats the item's own name", () => {
    const selfNaming = (entry: Item) => (entry.franchise === entry.name ? "" : entry.franchise);
    const index = franchiseIndex([item("Dune", "Dune"), item("Dune: Part Two", "Dune")], selfNaming);

    expect(index.get("Dune")?.map((entry) => entry.name)).toEqual(["Dune: Part Two"]);
  });
});
