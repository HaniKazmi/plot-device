import { describe, expect, it } from "vitest";
import Tabs, { HolidaysTab, MoviesTab, OmnibusTab, ShowsTab, VideoGamesTab, otherTabs, tabForPath } from "../src/tabs";

describe("the tab registry", () => {
  it("routes Omnibus, Games, Shows and Movies", () => {
    expect(Tabs.map((tab) => tab.id)).toEqual(["omnibus", "vg", "show", "movies"]);
  });

  it("leaves Holidays defined but unrouted, which is what makes the section unreachable", () => {
    expect(HolidaysTab.id).toBe("holiday");
    expect(Tabs).not.toContain(HolidaysTab);
  });

  it("gives every tab a distinct id, since the theme cache is keyed on it", () => {
    expect(new Set(Tabs.map((tab) => tab.id)).size).toBe(Tabs.length);
  });

  it("names a sheet and a range together, or neither", () => {
    // A range without a sheet is a tab that cannot fetch and does not say so; `SheetTab` requires
    // both, which is what keeps either half from being forgotten alone.
    for (const tab of Tabs) {
      expect(!!tab.range).toBe(!!tab.spreadsheetId);
      if (tab.range) expect(tab.range).toMatch(/^.+!.+$/);
    }
  });

  it("leaves Omnibus without a sheet of its own, since it composes the other three", () => {
    // Naming one of the three here would point the app bar's Sheet button at a third of what the
    // page is showing, and `SheetTab` is what keeps a fetch from being handed this tab at all.
    expect(OmnibusTab.spreadsheetId).toBeUndefined();
    expect(OmnibusTab.range).toBeUndefined();
  });
});

describe("tabForPath", () => {
  it("matches a path against the tab id", () => {
    expect(tabForPath("/vg")).toBe(VideoGamesTab);
    expect(tabForPath("/show")).toBe(ShowsTab);
    expect(tabForPath("/movies")).toBe(MoviesTab);
    expect(tabForPath("/omnibus")).toBe(OmnibusTab);
  });

  it("matches the bare id with no leading slash", () => {
    expect(tabForPath("show")).toBe(ShowsTab);
  });

  it("falls back to Omnibus at the root", () => {
    expect(tabForPath("/")).toBe(OmnibusTab);
    expect(tabForPath("")).toBe(OmnibusTab);
  });

  it("falls back rather than matching a trailing slash or a nested path", () => {
    // Only one leading slash is stripped and the comparison is exact, so nothing below a tab
    // resolves to it.
    expect(tabForPath("/show/")).toBe(OmnibusTab);
    expect(tabForPath("/show/detail")).toBe(OmnibusTab);
  });

  it("is case sensitive", () => {
    expect(tabForPath("/SHOW")).toBe(OmnibusTab);
  });

  it("sends the unrouted holiday path to Omnibus", () => {
    expect(tabForPath("/holiday")).toBe(OmnibusTab);
  });

  it("strips exactly one leading slash", () => {
    expect(tabForPath("//show")).toBe(OmnibusTab);
  });

  it("resolves against a caller-supplied list", () => {
    expect(tabForPath("/holiday", [HolidaysTab, VideoGamesTab])).toBe(HolidaysTab);
  });
});

describe("otherTabs", () => {
  it("offers every routed tab but the current one, as rail chips", () => {
    // The current tab is deliberately absent: the rail offers movement, not orientation, and a
    // chip for where the reader already is would rebuild the app bar the rail stands in for.
    expect(otherTabs(ShowsTab)).toEqual([
      { id: "omnibus", label: "Omnibus" },
      { id: "vg", label: "Games" },
      { id: "movies", label: "Movies" },
    ]);
  });

  it("never offers the unrouted Holidays tab", () => {
    expect(otherTabs(VideoGamesTab).map((tab) => tab.id)).not.toContain(HolidaysTab.id);
  });
});
