import { describe, expect, it } from "vitest";
import { statusToColour, type ColourableStatus } from "../../src/utils/types";

describe("statusToColour", () => {
  it.each([
    ["Abandoned", "#d10074"],
    ["Beat", "#338c5f"],
    ["Ended", "#338c5f"],
    ["Cancelled", "#9b6200"],
    ["Endless", "#2f75ff"],
    ["Up To Date", "#2f75ff"],
    ["Playing", "#00a5a6"],
    ["Watching", "#00a5a6"],
    ["Next", "#7d828c"],
    ["Backlog", "#7d828c"],
  ] satisfies [ColourableStatus, string][])("maps %s to %s", (status, expected) => {
    expect(statusToColour({ status })).toBe(expected);
  });

  it("keeps Cancelled and Abandoned on separate colours", () => {
    // The two are adjacent in every status chart and mean opposite things about who stopped
    // watching, so collapsing them onto one value hides the distinction rather than muting it.
    expect(statusToColour({ status: "Cancelled" })).not.toBe(statusToColour({ status: "Abandoned" }));
  });

  it("shares one colour between each domain's equivalent statuses", () => {
    // Beat/Ended and Playing/Watching are the same state in games and shows, so a stacked
    // chart mixing both domains reads as one band.
    expect(statusToColour({ status: "Beat" })).toBe(statusToColour({ status: "Ended" }));
    expect(statusToColour({ status: "Playing" })).toBe(statusToColour({ status: "Watching" }));
  });

  it("steps down in lightness from in-progress through open-ended to the terminal states", () => {
    // Lightness is a second encoding on top of hue: squinting at any status chart answers "how
    // much of this is still alive?" from brightness alone. This pins the ordering so a value
    // swap cannot silently break that reading.
    const luminance = (hex: string) => {
      const channel = (i: number) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
    };
    const of = (status: ColourableStatus) => luminance(statusToColour({ status })!);

    expect(of("Playing")).toBeGreaterThan(of("Endless"));
    expect(of("Endless")).toBeGreaterThan(of("Beat"));
    expect(of("Endless")).toBeGreaterThan(of("Cancelled"));
    expect(of("Endless")).toBeGreaterThan(of("Abandoned"));
  });

  it("returns undefined for a status outside the union instead of throwing", () => {
    // The switch has no default. Domain code casts sheet cells straight to Status
    // (`row.Status as Status`), so an unrecognised cell reaches here and yields no colour.
    const unknown = statusToColour({ status: "Postponed" as ColourableStatus });

    expect(unknown).toBeUndefined();
  });
});
