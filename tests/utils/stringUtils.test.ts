import { describe, expect, it } from "vitest";
import { keyLabel, namesTheSameThing, splitCell } from "../../src/utils/stringUtils";

describe("namesTheSameThing", () => {
  it("matches a title against itself", () => {
    expect(namesTheSameThing("Gladiator", "Gladiator")).toBe(true);
  });

  it("ignores a leading article, which the two columns disagree about", () => {
    // The franchise and the title are typed independently, and the article is where they drift.
    expect(
      namesTheSameThing(
        "Chronicles of Narnia: The Lion, the Witch and the Wardrobe",
        "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe",
      ),
    ).toBe(true);
    expect(namesTheSameThing("The Office", "Office")).toBe(true);
  });

  it("ignores case and surrounding space", () => {
    expect(namesTheSameThing("  star wars ", "Star Wars")).toBe(true);
  });

  it("keeps a franchise that is a prefix of the title apart from it", () => {
    // This is the case a card exists to show: the film belongs to a series wider than itself.
    expect(namesTheSameThing("Harry Potter", "Harry Potter and the Philosopher's Stone")).toBe(false);
    expect(namesTheSameThing("Pirates of the Caribbean", "Pirates of the Caribbean: Dead Man's Chest")).toBe(false);
    expect(namesTheSameThing("Lord of the Rings", "The Lord of the Rings: The Two Towers")).toBe(false);
  });

  it("keeps a franchise named nothing like the title apart from it", () => {
    expect(namesTheSameThing("DC", "The Dark Knight")).toBe(false);
  });

  it("strips only a leading article, not one inside the title", () => {
    // "The" appears mid-title constantly, and collapsing those would merge unrelated names.
    expect(namesTheSameThing("Night of the Hunter", "Night of Hunter")).toBe(false);
  });
});

describe("splitCell", () => {
  it("splits on the comma, with or without the space the sheets also write", () => {
    expect(splitCell("Drama, Mystery")).toEqual(["Drama", "Mystery"]);
    expect(splitCell("Drama,Mystery")).toEqual(["Drama", "Mystery"]);
  });

  it("gives an empty list rather than one holding an empty string", () => {
    // Readers count and render these directly, so [""] would show up as a blank entry and as a
    // value of its own in any tally.
    expect(splitCell("")).toEqual([]);
    expect(splitCell(",, ,")).toEqual([]);
  });

  it("treats a cell the row ended before as empty", () => {
    // The API ends a row at its last filled cell, so a trailing column can be absent entirely.
    expect(splitCell(undefined)).toEqual([]);
  });
});

describe("keyLabel", () => {
  it("breaks a camelCase key into words and sets it in sentence case", () => {
    // Sentence case rather than the theme's `capitalize`, which puts a capital on every word and
    // none inside a camelCase run: `startDate` reads "startDate" there and "Start Date" once
    // split, where a label wants one capital.
    expect(keyLabel("startDate")).toBe("Start date");
    expect(keyLabel("releaseDate")).toBe("Release date");
  });

  it("capitalises a single-word key and changes nothing else about it", () => {
    expect(keyLabel("name")).toBe("Name");
    expect(keyLabel("franchise")).toBe("Franchise");
  });

  it("leaves an already-capitalised word alone", () => {
    expect(keyLabel("Name")).toBe("Name");
  });

  it("answers an empty key with an empty label rather than throwing", () => {
    expect(keyLabel("")).toBe("");
  });
});
