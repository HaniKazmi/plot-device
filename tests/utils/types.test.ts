import { describe, expect, it } from "vitest";
import { statusToColour, type ColourableStatus } from "../../src/utils/types";

describe("statusToColour", () => {
  it.each([
    ["Abandoned", "#d62728"],
    ["Beat", "#2ca02c"],
    ["Ended", "#2ca02c"],
    ["Cancelled", "#d67728"],
    ["Endless", "#1f77b4"],
    ["Up To Date", "#1f77b4"],
    ["Playing", "#17becf"],
    ["Watching", "#17becf"],
    ["Next", "black"],
    ["Backlog", "black"],
  ] satisfies [ColourableStatus, string][])("maps %s to %s", (status, expected) => {
    expect(statusToColour({ status })).toBe(expected);
  });

  it("keeps Cancelled and Abandoned distinct, one hex digit apart", () => {
    // #d67728 vs #d62728 — close enough that a typo in either reads as the other on screen.
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
