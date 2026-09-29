import { describe, expect, it } from "vitest";
import { colourKeyEntries } from "../../src/common/colourKeyData";

const fills: Record<string, string | undefined> = { Nintendo: "#e60012", PC: "#c08600", Mystery: undefined };
const games = [{ company: "PC" }, { company: "Nintendo" }, { company: "PC" }, { company: "Mystery" }];

describe("colourKeyEntries", () => {
  it("names each value drawn once, with the colour its marks wear", () => {
    expect(
      colourKeyEntries(
        games,
        (game) => game.company,
        (game) => fills[game.company],
      ),
    ).toEqual([
      { value: "Nintendo", colour: "#e60012" },
      { value: "PC", colour: "#c08600" },
    ]);
  });

  it("leaves out a value its lookup answers nothing for, which no mark wears a colour for either", () => {
    const values = colourKeyEntries(
      games,
      (game) => game.company,
      (game) => fills[game.company],
    ).map((e) => e.value);

    expect(values).not.toContain("Mystery");
  });

  it("orders figures by what they count, not by their first digit", () => {
    const ages = ["18", "3", "12", "7"].map((age) => ({ age }));

    expect(
      colourKeyEntries(
        ages,
        (row) => row.age,
        () => "#000",
      ).map((entry) => entry.value),
    ).toEqual(["3", "7", "12", "18"]);
  });

  it("draws no key where nothing is coloured", () => {
    expect(colourKeyEntries(games, (game) => game.company, undefined)).toEqual([]);
  });
});
