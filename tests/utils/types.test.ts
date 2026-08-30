import { describe, expect, it } from "vitest";
import { statusToColour, type ColourableStatus } from "../../src/utils/types";

describe("statusToColour", () => {
  it.each([
    ["Abandoned", "#ba3a71"],
    ["Beat", "#29a259"],
    ["Ended", "#29a259"],
    ["Cancelled", "#a36500"],
    ["Endless", "#3a6cce"],
    ["Up To Date", "#3a6cce"],
    ["Playing", "#00a5a6"],
    ["Watching", "#00a5a6"],
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
