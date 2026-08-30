import { describe, expect, it } from "vitest";
import { namesTheSameThing } from "../../src/utils/stringUtils";

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
