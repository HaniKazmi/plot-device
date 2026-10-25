import { describe, expect, it } from "vitest";
import Tabs, {
  BooksTab,
  MoviesTab,
  OmnibusTab,
  ShowsTab,
  GamesTab,
  allTabs,
  atTabRoot,
  franchiseTab,
  spreadsheetFor,
  tabForPath,
  type DarkBar,
  type Tab,
} from "../src/tabs";
import { PAPERS, contrast } from "./fixtures/colour";
import { FRANCHISE_NAMES, franchiseToColour } from "../src/utils/types";

describe("the tab registry", () => {
  it("routes Omnibus, Games, Shows, Movies and Books", () => {
    expect(Tabs.map((tab) => tab.id)).toEqual(["omnibus", "games", "shows", "movies", "books"]);
  });

  it("gives every tab a distinct id, since the routes and the page stores are keyed on it", () => {
    expect(new Set(Tabs.map((tab) => tab.id)).size).toBe(Tabs.length);
  });

  it("gives every tab a single lowercase letter of its own, since `useTabKeys` answers each with that tab", () => {
    const letters = Tabs.map((tab) => tab.shortcut);
    letters.forEach((letter) => expect(letter).toMatch(/^[a-z]$/));
    expect(new Set(letters).size).toBe(letters.length);
  });

  it("names a sheet and a range together, or neither", () => {
    // A range without a sheet is a tab that cannot fetch and does not say so; `SheetTab` requires
    // both, which is what keeps either half from being forgotten alone.
    for (const tab of Tabs) {
      expect(!!tab.range).toBe(!!tab.spreadsheetId);
      if (tab.range) expect(tab.range).toMatch(/^.+!.+$/);
    }
  });

  it("leaves Omnibus without a sheet of its own, since it composes the other four", () => {
    // `SheetTab` is what keeps a fetch from being handed this tab at all.
    expect(OmnibusTab.spreadsheetId).toBeUndefined();
    expect(OmnibusTab.range).toBeUndefined();
  });
});

describe("spreadsheetFor", () => {
  it("opens a tab's own sheet", () => {
    expect(spreadsheetFor(GamesTab)).toBe(GamesTab.spreadsheetId);
  });

  it("opens the one book the other tabs share from the Omnibus, which reads no sheet of its own", () => {
    expect(spreadsheetFor(OmnibusTab)).toBe(GamesTab.spreadsheetId);
  });

  it("opens nothing from a composing tab where the tabs read different books", () => {
    const elsewhere = { ...ShowsTab, spreadsheetId: "another-book" };
    expect(spreadsheetFor(OmnibusTab, [OmnibusTab, GamesTab, elsewhere])).toBeUndefined();
  });
});

describe("tabForPath", () => {
  it("matches a path against the tab id", () => {
    expect(tabForPath("/games")).toBe(GamesTab);
    expect(tabForPath("/shows")).toBe(ShowsTab);
    expect(tabForPath("/movies")).toBe(MoviesTab);
    expect(tabForPath("/books")).toBe(BooksTab);
    expect(tabForPath("/omnibus")).toBe(OmnibusTab);
  });

  it("matches the bare id with no leading slash", () => {
    expect(tabForPath("shows")).toBe(ShowsTab);
  });

  it("falls back to Omnibus at the root", () => {
    expect(tabForPath("/")).toBe(OmnibusTab);
    expect(tabForPath("")).toBe(OmnibusTab);
  });

  it("names the tab a page standing under it belongs to, by the path's first segment", () => {
    expect(tabForPath("/shows/")).toBe(ShowsTab);
    expect(tabForPath("/shows/detail")).toBe(ShowsTab);
    expect(tabForPath("/omnibus/franchise/Star Wars")).toBe(OmnibusTab);
  });

  it("tells a tab's own page from one standing under it", () => {
    expect(atTabRoot("/")).toBe(true);
    expect(atTabRoot("/games")).toBe(true);
    expect(atTabRoot("/omnibus/franchise/Star Wars")).toBe(false);
  });

  it("is case sensitive", () => {
    expect(tabForPath("/SHOWS")).toBe(OmnibusTab);
  });

  it("falls back to the first tab for a well-formed path naming no tab", () => {
    expect(tabForPath("/holidays")).toBe(OmnibusTab);
  });

  it("strips exactly one leading slash", () => {
    expect(tabForPath("//shows")).toBe(OmnibusTab);
  });

  it("resolves against a caller-supplied list", () => {
    expect(tabForPath("/shows", [ShowsTab, MoviesTab])).toBe(ShowsTab);
    // The supplied list's own first entry is the fallback, not the module's.
    expect(tabForPath("/games", [ShowsTab, MoviesTab])).toBe(ShowsTab);
  });
});

describe("allTabs", () => {
  it("offers every routed tab, in the registry's own order", () => {
    // All five and always in this order: the chips are a fixed set of positions a hand learns, so
    // dropping the one in hand would slide the rest along by a chip on every navigation.
    expect(allTabs(ShowsTab, "light").map((tab) => [tab.id, tab.label])).toEqual([
      ["omnibus", "Omnibus"],
      ["games", "Games"],
      ["shows", "Shows"],
      ["movies", "Movies"],
      ["books", "Books"],
    ]);
  });

  it("marks the tab in hand and nothing else", () => {
    // The lit chip is orientation, and exactly one of five is where the reader is.
    expect(
      allTabs(ShowsTab, "light")
        .filter((tab) => tab.current)
        .map((tab) => tab.id),
    ).toEqual(["shows"]);
  });

  it("carries each tab's own icon and the colour it is named in on that paper", () => {
    // A rail chip is the glyph and the hue and nothing else, so both travel with the entry.
    const [omnibus] = allTabs(ShowsTab, "light");
    expect(omnibus.icon).toBe(OmnibusTab.icon);
    expect(omnibus.colour).toBe(OmnibusTab.primaryColour);
    expect(allTabs(ShowsTab, "dark")[0].colour).toBe(OmnibusTab.darkBar?.ink);
  });
});

describe("the dark app-bar triples", () => {
  const isColoured = (tab: Tab): tab is Tab & { primaryColour: string; darkBar: DarkBar } =>
    !!tab.primaryColour && !!tab.darkBar;

  const colouredTabs = Tabs.filter(isColoured);

  it("gives a dark bar to every tab that carries a primary colour", () => {
    expect(colouredTabs.map((tab) => tab.id)).toEqual(Tabs.filter((tab) => tab.primaryColour).map((tab) => tab.id));
  });

  it("clears 4.5:1 for the ink and 3:1 for the rule against the tint", () => {
    for (const tab of colouredTabs) {
      const { tint, rule, ink } = tab.darkBar;
      expect(contrast(ink, tint), `${tab.name} ink (${ink}) on tint (${tint})`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rule, tint), `${tab.name} rule (${rule}) on tint (${tint})`).toBeGreaterThanOrEqual(3);
    }
  });

  it("clears the same floors against the dark paper, where both are drawn away from the bar", () => {
    // `rule` is the dark scheme's `primary.main` (`Google.tsx`), so it draws a lit segment's word
    // and a picker's lit edge on the paper; `ink` names a tab on a rail chip there. Neither is on
    // the tint at those sites, and a value solved against the tint alone can be the wrong side of
    // the floor on the paper — 3:1 for a mark, 4.5 for type.
    for (const tab of colouredTabs) {
      const { rule, ink } = tab.darkBar;
      expect(contrast(rule, PAPERS.dark), `${tab.name} rule (${rule}) on the dark paper`).toBeGreaterThanOrEqual(3);
      expect(contrast(ink, PAPERS.dark), `${tab.name} ink (${ink}) on the dark paper`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("franchiseTab", () => {
  const themed = FRANCHISE_NAMES.map((name) => ({ name, tab: franchiseTab(OmnibusTab, name) }));

  it("holds every franchise's colours to the floors a tab's own are held to", () => {
    // The table lets seven franchises sit under 3:1 on the white paper beside a name; a theme's
    // primary carries type there, so the derived tab has to clear what `colouredTabs` above clear.
    for (const { name, tab } of themed) {
      const { tint, rule, ink } = tab.darkBar!;
      expect(contrast(tab.primaryColour!, PAPERS.light), `${name} primary on the light paper`).toBeGreaterThanOrEqual(
        3,
      );
      for (const ground of [tint, PAPERS.dark]) {
        expect(contrast(rule, ground), `${name} rule on ${ground}`).toBeGreaterThanOrEqual(3);
        expect(contrast(ink, ground), `${name} ink on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps a franchise's own colour where it already clears the floor", () => {
    expect(franchiseTab(OmnibusTab, "Marvel").primaryColour).toBe(franchiseToColour({ franchise: "Marvel" }, "light"));
  });

  it("keeps the tab's id, so everything asking which tab is open still answers the Omnibus", () => {
    expect(franchiseTab(OmnibusTab, "Star Wars").id).toBe(OmnibusTab.id);
  });

  it("answers one object per franchise, the theme being cached on it", () => {
    expect(franchiseTab(OmnibusTab, "Star Wars")).toBe(franchiseTab(OmnibusTab, "Star Wars"));
  });

  it("leaves the tab as it is for a franchise the table holds no colour for", () => {
    expect(franchiseTab(OmnibusTab, "Discworld")).toBe(OmnibusTab);
  });
});
