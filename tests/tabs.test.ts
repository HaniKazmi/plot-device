import { describe, expect, it } from "vitest";
import Tabs, {
  BooksTab,
  MoviesTab,
  OmnibusTab,
  ShowsTab,
  VideoGamesTab,
  otherTabs,
  tabForPath,
  type DarkBar,
  type Tab,
} from "../src/tabs";
import { PAPERS, contrast } from "./fixtures/colour";

describe("the tab registry", () => {
  it("routes Omnibus, Games, Shows, Movies and Books", () => {
    expect(Tabs.map((tab) => tab.id)).toEqual(["omnibus", "vg", "show", "movies", "books"]);
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
    expect(tabForPath("/books")).toBe(BooksTab);
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

  it("falls back to the first tab for a well-formed path naming no tab", () => {
    expect(tabForPath("/holidays")).toBe(OmnibusTab);
  });

  it("strips exactly one leading slash", () => {
    expect(tabForPath("//show")).toBe(OmnibusTab);
  });

  it("resolves against a caller-supplied list", () => {
    expect(tabForPath("/show", [ShowsTab, MoviesTab])).toBe(ShowsTab);
    // The supplied list's own first entry is the fallback, not the module's.
    expect(tabForPath("/vg", [ShowsTab, MoviesTab])).toBe(ShowsTab);
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
      { id: "books", label: "Books" },
    ]);
  });
});

describe("the dark app-bar triples", () => {
  // A hex channel, read independently of anything `src/` does with one.
  const channels = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));

  // `round(ratio * from + (1 - ratio) * toward)` per channel — the mix `tabs.ts` claims to draw
  // its tint from, computed here rather than imported so the test cannot pass by repeating
  // whatever `darkBar.tint` was typed there.
  const mix = (from: string, toward: string, ratio: number) => {
    const [fr, fg, fb] = channels(from);
    const [tr, tg, tb] = channels(toward);
    return [fr, fg, fb].map((f, i) => Math.round(ratio * f + (1 - ratio) * [tr, tg, tb][i]));
  };

  const isColoured = (tab: Tab): tab is Tab & { primaryColour: string; darkBar: DarkBar } =>
    !!tab.primaryColour && !!tab.darkBar;

  const colouredTabs = Tabs.filter(isColoured);

  it("gives a dark bar to every tab that carries a primary colour", () => {
    expect(colouredTabs.map((tab) => tab.id)).toEqual(Tabs.filter((tab) => tab.primaryColour).map((tab) => tab.id));
  });

  it("mixes the tint at 22% of the primary over the dark paper, within a channel of rounding", () => {
    for (const tab of colouredTabs) {
      const expected = mix(tab.primaryColour, PAPERS.dark, 0.22);
      const actual = channels(tab.darkBar.tint);
      expected.forEach((e, i) => {
        expect(Math.abs(actual[i] - e), `${tab.name} tint channel ${i}`).toBeLessThanOrEqual(1);
      });
    }
  });

  it("clears 4.5:1 for the ink and 3:1 for the rule against the tint", () => {
    for (const tab of colouredTabs) {
      const { tint, rule, ink } = tab.darkBar;
      expect(contrast(ink, tint), `${tab.name} ink (${ink}) on tint (${tint})`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rule, tint), `${tab.name} rule (${rule}) on tint (${tint})`).toBeGreaterThanOrEqual(3);
    }
  });
});
