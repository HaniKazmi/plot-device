import { describe, expect, it } from "vitest";
import { NEUTRAL_FILL, genreToColour, type AgeRating } from "../../src/utils/types";
import {
  companyToAccent,
  companyToColor,
  mutedGenreToColour,
  gameplayToColour,
  groupToColour,
  platformToColor,
  platformToShort,
  type Platform,
} from "../../src/vg/types";
import { KNOWN_PLATFORMS, videoGame } from "../fixtures/vgRows";
import { PAPERS, contrast, liveGenres } from "../fixtures/colour";

describe("platform colour lookups", () => {
  it.each(KNOWN_PLATFORMS)("resolves %s to both a colour and a short name", (platform) => {
    // A platform whose first word is not a known company reaches companyToColor and comes back
    // undefined, so the colour assertion catches it here rather than at render time.
    expect(() => platformToColor(platform)).not.toThrow();

    const [short, colour] = platformToShort(videoGame({ platform }));
    expect(short).toBeTruthy();
    expect(colour).toBeTruthy();
  });

  it("accepts either a bare platform or an object carrying one", () => {
    expect(platformToColor("Nintendo Switch")).toBe(platformToColor({ platform: "Nintendo Switch" }));
  });

  it("gives every console from one company the same colour, so charts group by brand", () => {
    expect(platformToColor("PlayStation 4")).toBe(platformToColor("PlayStation 5"));
    expect(platformToColor("Nintendo DS")).toBe(platformToColor("Nintendo Switch"));
  });

  it("throws on an unknown platform rather than falling back to a neutral colour", () => {
    // Deliberate: a typo or a new console in the spreadsheet surfaces immediately instead of
    // rendering as an anonymous grey bar nobody notices.
    expect(() => platformToColor("Sega Saturn" as Platform)).toThrow("Unknown platform: Sega Saturn");
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

    expect(companyToAccent(game)).not.toBe(companyToColor(game));
    expect(platformToColor(game.platform)).toBe(companyToColor(game));
  });
});

describe("companyToColor", () => {
  it.each(["Nintendo", "PlayStation", "Xbox", "PC", "iOS"] as const)("has a colour for %s", (company) => {
    expect(companyToColor({ company })).toBeTruthy();
    // Both halves cover the same set, or a console draws its chip from a lookup that has no
    // entry for it and renders on the theme's primary as if it had no company at all.
    expect(companyToAccent({ company })).toBeTruthy();
  });

  it("returns undefined for an unknown company instead of throwing", () => {
    // Unlike the platform lookups, this switch has no default branch. `company` is derived by
    // splitting the platform string, so any platform whose first word is new lands here.
    expect(companyToColor({ company: "Sega" as "Xbox" })).toBeUndefined();
  });
});

describe("groupToColour", () => {
  it("dispatches to the lookup matching the grouping key", () => {
    const game = videoGame();

    expect(groupToColour("company", game)).toBe(companyToColor(game));
    expect(groupToColour("status", game)).toBe("#338c5f");
    expect(groupToColour("rating", game)).toBe("#c27400");
    expect(groupToColour("gameplay", game)).toBe(gameplayToColour(game));
    expect(groupToColour("genre", game)).toBe(mutedGenreToColour(game.genre));
  });

  it("draws the two vocabularies apart even where their tables share a hex", () => {
    // Nine hexes appear in both tables under different names, and a card states both vocabularies
    // in turn — 81 of 340 games pair a gameplay and a genre that share one, 78 of them this pair.
    const shared = videoGame({ gameplay: "Role Playing", genre: "Fantasy" });

    expect(gameplayToColour(shared)).toBe(genreToColour("Fantasy"));
    expect(groupToColour("gameplay", shared)).not.toBe(groupToColour("genre", shared));
  });

  it("falls back to an empty string for a group with no colour of its own", () => {
    // Callers read "" as "let Highcharts pick from its palette".
    expect(groupToColour("developer", videoGame())).toBe("");
    expect(groupToColour("none", videoGame())).toBe("");
  });

  it("propagates the rating throw, because grouping by rating renders every game", () => {
    // The cast is the point: the union describes what the sheet should hold, and a blank cell
    // is what it holds when someone forgets — that has to reach the throw rather than a fallback.
    expect(() => groupToColour("rating", videoGame({ rating: "" as AgeRating }))).toThrow("Unknown rating");
  });
});

describe("mutedGenreToColour", () => {
  it.each(liveGenres)("keeps %s clear of both papers, so muting does not cost the fill contract", (genre) => {
    // Muting pulls a fill toward its own luminance in linear light, so contrast is untouched and
    // whatever the source cleared the muted value clears. Nothing else asserts this contract, and
    // a fill that fails it is legible in one colour scheme and invisible in the other.
    expect(contrast(mutedGenreToColour(genre), PAPERS.light)).toBeGreaterThanOrEqual(3);
    expect(contrast(mutedGenreToColour(genre), PAPERS.dark)).toBeGreaterThanOrEqual(3);
  });

  it("passes the neutral through undimmed, so absence is one grey on every tab", () => {
    // NEUTRAL_FILL is a blue-grey rather than achromatic, so desaturating it would move it — and
    // move it for exactly the games the converter's "Other" default lands on.
    expect(mutedGenreToColour("Documentary")).toBe(NEUTRAL_FILL);
    expect(mutedGenreToColour("Other")).toBe(NEUTRAL_FILL);
  });
});
