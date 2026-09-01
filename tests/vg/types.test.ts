import { describe, expect, it } from "vitest";
import { genreToColour, type AgeRating } from "../../src/utils/types";
import {
  companyToAccent,
  companyToColor,
  gameplayToColour,
  groupToColour,
  platformToColor,
  platformToShort,
  type Platform,
} from "../../src/vg/types";
import { KNOWN_PLATFORMS, videoGame } from "../fixtures/vgRows";

describe("platform colour lookups", () => {
  it.each(KNOWN_PLATFORMS)("resolves %s to both a colour and a short name", (platform) => {
    // A platform whose first word is not a known company reaches companyToColor and comes back
    // undefined, so the colour assertion catches it here rather than at render time.
    expect(() => platformToColor(platform, "light")).not.toThrow();

    const [short, colour] = platformToShort(videoGame({ platform }));
    expect(short).toBeTruthy();
    expect(colour).toBeTruthy();
  });

  it("accepts either a bare platform or an object carrying one", () => {
    expect(platformToColor("Nintendo Switch", "light")).toBe(platformToColor({ platform: "Nintendo Switch" }, "light"));
  });

  it("gives every console from one company the same colour, so charts group by brand", () => {
    expect(platformToColor("PlayStation 4", "light")).toBe(platformToColor("PlayStation 5", "light"));
    expect(platformToColor("Nintendo DS", "light")).toBe(platformToColor("Nintendo Switch", "light"));
  });

  it("throws on an unknown platform rather than falling back to a neutral colour", () => {
    // Deliberate: a typo or a new console in the spreadsheet surfaces immediately instead of
    // rendering as an anonymous grey bar nobody notices.
    expect(() => platformToColor("Sega Saturn" as Platform, "light")).toThrow("Unknown platform: Sega Saturn");
    expect(() => platformToShort(videoGame({ platform: "Sega Saturn" as Platform }))).toThrow(
      "Unknown platform: Sega Saturn",
    );
  });

  it("takes the short name from the platform but the colour from the company", () => {
    const game = videoGame({ platform: "Nintendo 3DS", company: "Nintendo" });

    expect(platformToShort(game)).toEqual(["3DS", companyToAccent(game)]);
  });

  it("gives the corner chip the brand accent, not the muted fill charts are drawn in", () => {
    // The two lookups exist to differ: a chip is read on its own and wants full saturation,
    // while five fills sit side by side in one chart and have to stay separable there.
    const game = videoGame({ platform: "Nintendo 3DS", company: "Nintendo" });

    expect(companyToAccent(game)).not.toBe(companyToColor(game, "light"));
    expect(platformToColor(game.platform, "light")).toBe(companyToColor(game, "light"));
  });
});

describe("companyToColor", () => {
  it.each(["Nintendo", "PlayStation", "Xbox", "PC", "iOS"] as const)("has a colour for %s", (company) => {
    expect(companyToColor({ company }, "light")).toBeTruthy();
    // Both halves cover the same set, or a console draws its chip from a lookup that has no
    // entry for it and renders on the theme's primary as if it had no company at all.
    expect(companyToAccent({ company })).toBeTruthy();
  });

  it("returns undefined for an unknown company instead of throwing", () => {
    // Unlike the platform lookups, this switch has no default branch. `company` is derived by
    // splitting the platform string, so any platform whose first word is new lands here.
    expect(companyToColor({ company: "Sega" as "Xbox" }, "light")).toBeUndefined();
  });
});

describe("groupToColour", () => {
  it("dispatches to the lookup matching the grouping key", () => {
    const game = videoGame();

    expect(groupToColour("company", game, "light")).toBe(companyToColor(game, "light"));
    expect(groupToColour("status", game, "light")).toBe("#326e54");
    expect(groupToColour("rating", game, "light")).toBe("#be7e00");
    expect(groupToColour("gameplay", game, "light")).toBe(gameplayToColour(game, "light"));
    expect(groupToColour("genre", game, "light")).toBe(genreToColour(game.genre, "light"));
  });

  it("keeps the gameplay and genre vocabularies apart, so a card can state both at full chroma", () => {
    // A card sets the two swatches side by side — the hero and hover subtitles, and the ledger's
    // Gameplay row above its Genre row. The pair that used to collide hardest was Role Playing
    // beside Fantasy, which is 78 of the 340 games.
    const pair = videoGame({ gameplay: "Role Playing", genre: "Fantasy" });

    expect(groupToColour("gameplay", pair, "light")).not.toBe(groupToColour("genre", pair, "light"));
    expect(groupToColour("gameplay", pair, "dark")).not.toBe(groupToColour("genre", pair, "dark"));
  });

  it("colours Action and Adventure the same in both vocabularies, which is the one deliberate match", () => {
    // Those two names mean the same thing whether they describe how a game is played or what it
    // is about, so one colour is the honest answer rather than a collision to break.
    for (const name of ["Action", "Adventure"] as const) {
      const game = videoGame({ gameplay: name, genre: name });
      expect(groupToColour("gameplay", game, "light")).toBe(groupToColour("genre", game, "light"));
    }
  });

  it("falls back to an empty string for a group with no colour of its own", () => {
    // Callers read "" as "let Highcharts pick from its palette".
    expect(groupToColour("developer", videoGame(), "light")).toBe("");
    expect(groupToColour("none", videoGame(), "light")).toBe("");
  });

  it("propagates the rating throw, because grouping by rating renders every game", () => {
    // The cast is the point: the union describes what the sheet should hold, and a blank cell
    // is what it holds when someone forgets — that has to reach the throw rather than a fallback.
    expect(() => groupToColour("rating", videoGame({ rating: "" as AgeRating }), "light")).toThrow("Unknown rating");
  });
});
