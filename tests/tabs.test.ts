import { describe, expect, it } from "vitest";
import Tabs, { HolidaysTab, MoviesTab, ShowsTab, VideoGamesTab, tabForPath } from "../src/tabs";

describe("the tab registry", () => {
  it("routes Games, Shows and Movies", () => {
    expect(Tabs.map((tab) => tab.id)).toEqual(["vg", "show", "movies"]);
  });

  it("leaves Holidays defined but unrouted, which is what makes the section unreachable", () => {
    expect(HolidaysTab.id).toBe("holiday");
    expect(Tabs).not.toContain(HolidaysTab);
  });

  it("gives every tab a distinct id, since the theme cache is keyed on it", () => {
    expect(new Set(Tabs.map((tab) => tab.id)).size).toBe(Tabs.length);
  });

  it("names a sheet and a range for every tab", () => {
    for (const tab of Tabs) {
      expect(tab.spreadsheetId).toBeTruthy();
      expect(tab.range).toMatch(/^.+!.+$/);
    }
  });
});

describe("tabForPath", () => {
  it("matches a path against the tab id", () => {
    expect(tabForPath("/vg")).toBe(VideoGamesTab);
    expect(tabForPath("/show")).toBe(ShowsTab);
    expect(tabForPath("/movies")).toBe(MoviesTab);
  });

  it("matches the bare id with no leading slash", () => {
    expect(tabForPath("show")).toBe(ShowsTab);
  });

  it("falls back to Games at the root", () => {
    expect(tabForPath("/")).toBe(VideoGamesTab);
    expect(tabForPath("")).toBe(VideoGamesTab);
  });

  it("falls back rather than matching a trailing slash or a nested path", () => {
    // Only one leading slash is stripped and the comparison is exact, so nothing below a tab
    // resolves to it.
    expect(tabForPath("/show/")).toBe(VideoGamesTab);
    expect(tabForPath("/show/detail")).toBe(VideoGamesTab);
  });

  it("is case sensitive", () => {
    expect(tabForPath("/SHOW")).toBe(VideoGamesTab);
  });

  it("sends the unrouted holiday path to Games", () => {
    expect(tabForPath("/holiday")).toBe(VideoGamesTab);
  });

  it("strips exactly one leading slash", () => {
    expect(tabForPath("//show")).toBe(VideoGamesTab);
  });

  it("resolves against a caller-supplied list", () => {
    expect(tabForPath("/holiday", [HolidaysTab, VideoGamesTab])).toBe(HolidaysTab);
  });
});
