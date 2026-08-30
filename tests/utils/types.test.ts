import { describe, expect, it } from "vitest";
import { statusToColour, type ColourableStatus } from "../../src/utils/types";

describe("statusToColour", () => {
  it.each([
    ["Abandoned", "#af5074"],
    ["Beat", "#50a170"],
    ["Ended", "#50a170"],
    ["Cancelled", "#a36e09"],
    ["Endless", "#5376b8"],
    ["Up To Date", "#5376b8"],
    ["Playing", "#00a39a"],
    ["Watching", "#00a39a"],
    ["Next", "black"],
    ["Backlog", "black"],
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

  it("returns undefined for a status outside the union instead of throwing", () => {
    // The switch has no default. Domain code casts sheet cells straight to Status
    // (`row.Status as Status`), so an unrecognised cell reaches here and yields no colour.
    const unknown = statusToColour({ status: "Postponed" as ColourableStatus });

    expect(unknown).toBeUndefined();
  });
});
