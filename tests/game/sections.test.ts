import { describe, expect, it } from "vitest";
import { GAME_SECTIONS, gameSections } from "../../src/game/sections";

describe("gameSections", () => {
  it("offers the Now chip only when the page has a hero for it to point at", () => {
    expect(gameSections(true).map((section) => section.id)).toContain(GAME_SECTIONS.now);
    expect(gameSections(false).map((section) => section.id)).not.toContain(GAME_SECTIONS.now);
  });

  it("puts Now first, because the rail runs in the order the page does", () => {
    expect(gameSections(true)[0].id).toBe(GAME_SECTIONS.now);
  });

  it("puts Library after Charts, so the wall closes the page at every width", () => {
    const ids = gameSections(true).map((section) => section.id);

    expect(ids.at(-1)).toBe(GAME_SECTIONS.library);
  });

  it("names every other anchor whether or not anything is being played", () => {
    const withoutNow = Object.values(GAME_SECTIONS).filter((id) => id !== GAME_SECTIONS.now);
    expect(gameSections(false).map((section) => section.id)).toEqual(withoutNow);
  });
});
