import { describe, expect, it } from "vitest";
import { companyToColor, groupToColour, platformToColor, platformToShort, type Platform } from "../../src/vg/types";
import { KNOWN_PLATFORMS, videoGame } from "../fixtures/vgRows";

describe("platform colour lookups", () => {
  it.each(KNOWN_PLATFORMS)("resolves %s through both the colour and the short-name list", (platform) => {
    // platformToColor's switch and platformShortNames are maintained separately. A platform
    // added to only one of them fails here rather than at render time.
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

    expect(platformToShort(game)).toEqual(["3DS", companyToColor(game)]);
  });
});

describe("companyToColor", () => {
  it.each(["Nintendo", "PlayStation", "Xbox", "PC", "iOS"] as const)("has a colour for %s", (company) => {
    expect(companyToColor({ company })).toBeTruthy();
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
    expect(groupToColour("status", game)).toBe("#2ca02c");
    expect(groupToColour("rating", game)).toBe("#c27400");
  });

  it("falls back to an empty string for a group with no colour of its own", () => {
    // Callers read "" as "let Highcharts pick from its palette".
    expect(groupToColour("developer", videoGame())).toBe("");
    expect(groupToColour("none", videoGame())).toBe("");
  });

  it("propagates the rating throw, because grouping by rating renders every game", () => {
    expect(() => groupToColour("rating", videoGame({ rating: "" }))).toThrow("Unknown rating");
  });
});
