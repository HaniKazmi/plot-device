import type { FunctionComponent } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import { GridView, MenuBook, SportsEsports, Theaters, Tv } from "@mui/icons-material";
import { franchiseToColour, type Colour, type Scheme } from "./utils/types";
import { useEffect, useEffectEvent } from "react";
import { useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { franchiseAt } from "./app/franchisePage";
import { inEditableField, stepIndex, usePageKeys } from "./common/keyboard";
import { useScheme } from "./common/useScheme";
import Shows from "./show/Show";
import VideoGames from "./game/Game";
import Movies from "./movie/Movie";
import Books from "./book/Book";
import Omnibus from "./omnibus/Omnibus";

/**
 * A tab's app-bar identity in the dark colour scheme, where `enableColorOnDark` stays off
 * (`Google.tsx`) and MUI would otherwise paint the bar as plain paper — leaving the 2px secondary
 * indicator as the only thing that says which of five tabs is open.
 *
 * `tint` is a 22% mix of `primaryColour` over that paper, `#1d2126`, computed by `tint()` below:
 * the primary at full strength on dark
 * paper is the light bar's own treatment redrawn on the wrong ground, where a fifth of it is
 * what still carries the hue without losing the scheme. `rule` and `ink` are lighter siblings of
 * the primary at the same hue, solved against `tint` rather than against the paper — `ink` clears
 * 4.5:1 and `rule` clears 3:1, and both clear those floors against the paper too, which is what
 * lets them be drawn away from the bar. `rule` draws a 3px line along the bar's own bottom edge,
 * which is what still separates five tinted bars at a glance, and is the dark scheme's own
 * `primary.main` (`Google.tsx`): a lit segment's word and a picker's edge are the primary at 12px
 * on the paper, where the light primary the tint is mixed from stands at about 3:1 for a
 * full-strength surface and under it for type. `ink` carries the wordmark, the active tab's own
 * label and a rail chip naming the tab.
 */
export interface DarkBar {
  tint: string;
  rule: string;
  ink: string;
}

export const DARK_PAPER = "#1d2126";
const TINT_STRENGTH = 0.22;

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);

/** `round(amount * from + (1 - amount) * to)` per channel. */
const mix = (from: string, to: string, amount: number): string => {
  const mixed = [0, 1, 2].map((i) => Math.round(amount * channel(from, i) + (1 - amount) * channel(to, i)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
};

/** `round(0.22 * primary + 0.78 * paper)` per channel: the bar's ground in the dark scheme. */
const tint = (primary: string): string => mix(primary, DARK_PAPER, TINT_STRENGTH);

/**
 * A tab's colours: the two the light scheme is built from, and the dark bar's triple with its
 * tint derived from the primary rather than typed beside it. `rule` and `ink` are solved by hand
 * against the tint and the paper (`tests/tabs.test.ts` holds them to their floors).
 */
const colours = (primary: string, secondary: string, rule: string, ink: string) => ({
  primaryColour: primary,
  secondaryColour: secondary,
  darkBar: { tint: tint(primary), rule, ink },
});

/**
 * The colour a tab's app bar wears in a scheme: the primary on the light paper, the tint on the
 * dark. Undefined for a tab with neither, which `Google.tsx` paints as plain paper. The one place
 * that answers, so a surface painted to match the bar — the Omnibus's Now cards — cannot drift
 * from it.
 */
export const barColour = (tab: Tab, scheme: Scheme): Colour | undefined =>
  (scheme === "dark" ? tab.darkBar?.tint : tab.primaryColour) as Colour | undefined;

export interface Tab {
  /**
   * The tab's route as well as its key: `App.tsx` renders it as the path, so this is what stands
   * after the hash, and `tabForPath` reads it back. It is also what `PAGE_MODULES` and
   * `PAGE_STORES` are keyed on, so a surface narrowing a tab it is not standing on names it by this.
   *
   * The tab's own name, lowercased — plural, because every one of them names a library rather than
   * a work. The one part of a tab a reader ever sees written down.
   */
  id: string;
  name: string;
  /**
   * The letter that opens this tab from anywhere a bare key reaches the page (`useTabKeys`) — its
   * name's own first letter, which every tab here has to itself. Stated rather than derived, so a
   * tab whose name begins with a letter another key already answers is given a different one here
   * instead of silently taking that key over; `tests/tabs.test.ts` holds the five apart.
   */
  shortcut: string;
  /**
   * The sheet this tab reads, absent on a tab that reads none of its own. Omnibus composes the
   * four the other tabs already fetch, so an id here would hand it a fetch of its own; what its
   * "Sheet" action opens is the book those four share (`spreadsheetFor`).
   */
  spreadsheetId?: string;
  /**
   * Deliberately wider than the columns in use. `arrayToJson` keys each row by its header name, so
   * a range only has to *cover* a column for the converter to find it — but a column added or
   * moved past the end of a tight range simply stops arriving, with no error anywhere: the field
   * is absent on every row rather than wrong on one. Trailing empty columns cost one extra key.
   */
  range?: string;
  component: FunctionComponent;
  /**
   * The tab's mark in the bottom navigation, which is the only place a tab is named by anything
   * but its word. Every tab carries one: an action without an icon leaves a label floating in a
   * bar sized for both.
   */
  icon: SvgIconComponent;
  primaryColour?: string;
  secondaryColour?: string;
  /**
   * Present on every tab that carries a `primaryColour` — there is currently no tab that has one
   * without the other, and `Google.tsx` falls back to the plain paper bar for a tab that has
   * neither.
   */
  darkBar?: DarkBar;
}

/**
 * A tab that names a sheet, which is what `useData` and `fetchAndConvertSheet` require. Keeping
 * the requirement in the type rather than in an assertion is what lets a sheetless tab exist at
 * all without either faking an id or leaving every fetch to check for one.
 */
export type SheetTab = Tab & Required<Pick<Tab, "spreadsheetId" | "range">>;

export const GamesTab: SheetTab = {
  id: "games",
  name: "Games",
  shortcut: "g",
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Games!A:Z",
  component: VideoGames,
  icon: SportsEsports,
  ...colours("#d019ca", "#14bb7c", "#ea4be4", "#f07aeb"),
};

export const ShowsTab: SheetTab = {
  id: "shows",
  name: "Shows",
  shortcut: "s",
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Shows!A:Z",
  component: Shows,
  icon: Tv,
  ...colours("#127d9c", "#fe799b", "#3fb3d3", "#6cc7e0"),
};

export const MoviesTab: SheetTab = {
  id: "movies",
  name: "Movies",
  shortcut: "m",
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Movies!A:Z",
  component: Movies,
  icon: Theaters,
  ...colours("#de4412", "#499dfe", "#ff7043", "#ff8f6b"),
};

/**
 * The Books tab: one row per book, full dates throughout, and an `Artwork` column holding a cover
 * URL the way the other three hold theirs.
 *
 * The primary is a gold at hue 98 — 3.87 on the white paper and 4.18 on the dark, and 16.7 from
 * the nearest of the other nine values. `mediumColours.book` in `app/types.ts` is the matching
 * medium fill, and the two are chosen together: a book is this gold whether it is a bar on the
 * Omnibus or the bar over it.
 */
export const BooksTab: SheetTab = {
  id: "books",
  name: "Books",
  shortcut: "b",
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Books!A:Z",
  component: Books,
  icon: MenuBook,
  ...colours("#958112", "#ca82fe", "#c7b143", "#d6c45a"),
};

/**
 * The tab reads no sheet of its own: it mounts the three domains' own data configurations and
 * composes their output, so a medium's rows reach it through exactly the converter and cache its
 * home tab uses.
 *
 * Its violet is one of five hues taken from the arcs the **status** ramp leaves free, which is the
 * one vocabulary every tab draws. That is as far as the rule goes: a tab also draws the genre ramp,
 * which covers the whole wheel, and its own branded tables, so no hue clears everything on its own
 * page: Games sits 5.8 from the Party Games fill, against the 19.5 that separates the four tab
 * colours from each other. What keeps that from misleading is that the two never
 * appear as peers: a primary is a full-width band or a lone series, a vocabulary fill is a mark
 * inside a card, and `Barchart` only reaches for the primary when a chart has no other series to
 * confuse it with.
 *
 * Every primary clears 3:1 on both papers, because `Barchart` paints a single-group series in
 * `theme.palette.primary.main` — which under `cssVariables: true` is the light scheme's literal
 * whichever paper is on screen, the schemes differing only in the CSS variable the dark half sets
 * to `darkBar.rule`. A theme colour is chart geometry, so it is held to the same floor as a
 * `Fill`. The contract test asserts it
 * alongside every other table, which is the only floor under a colour that lives out here on a
 * `Tab` rather than in one of the tables.
 *
 * The medium quartet in `app/types.ts` is chosen from the same five hues, by hand — nothing
 * derives one from the other, so moving a tab's primary means moving its medium fill in the same
 * edit.
 *
 * A secondary is **not** its primary's complement. The primaries are spread around the wheel, so
 * 180° from any one of them lands on another: complements put the Movies accent 3.2 dE from the
 * Shows app bar. Each secondary instead sits in a gap *between* two primaries, so the ten
 * interleave — no accent reads as another tab's bar, and the closest of all ten pairs is 16.7 dE,
 * in OKLab distance ×100. Each still lands over 31 dE from its own primary, which is what
 * `NavBar`'s indicator needs: it is drawn on that primary.
 *
 * The five are solved together rather than one at a time. Books' gap, Omnibus→Games, is 45° wide
 * where the other four span 61° to 126°, and a value seated in it with the other four accents held
 * fixed reaches only 14.1 from the Omnibus bar. Every accent moving within its own gap is what
 * clears the floor for all five: the values here are the joint solution, and re-solving any one of
 * them alone gives up the floor for the pair it sits nearest.
 *
 * Its icon is four equal squares, where every other tab's is the thing it holds — a gamepad, a
 * television, a film strip, a book. Four of anything says "all of them" beside those four, and at
 * the 18px the rail draws a tab chip at, equal squares are the reading that survives: a grid of
 * nine dots is a texture at that size, and panels of unequal size read as a layout.
 */
export const OmnibusTab: Tab = {
  id: "omnibus",
  name: "Omnibus",
  shortcut: "o",
  component: Omnibus,
  icon: GridView,
  ...colours("#7553ff", "#ef9716", "#9d86ff", "#b3a2ff"),
};

/**
 * Omnibus leads the array, which is what puts it at the root route: `App.tsx` renders
 * `Tabs[0].component` for the index route, and `tabForPath` falls back to `tabs[0]` for any path
 * that matches no tab id, root included.
 */
const Tabs: Tab[] = [OmnibusTab, GamesTab, ShowsTab, MoviesTab, BooksTab];

/** A path's segments after exactly one leading slash, so `//shows` names no tab. */
const segmentsOf = (pathname: string) => pathname.replace(/^\//, "").split("/");

/**
 * The tab a route belongs to, by its first segment, falling back to the first tab.
 *
 * The first segment rather than the whole path, so a page standing under a tab — a franchise's,
 * under the Omnibus — names the tab it belongs to rather than inheriting whichever tab leads the
 * array. Case-sensitive, as the routes are.
 */
export const tabForPath = (pathname: string, tabs: readonly Tab[] = Tabs): Tab =>
  tabs.find((tab) => tab.id === segmentsOf(pathname)[0]) ?? tabs[0];

/**
 * Whether a path is a tab's own page rather than one standing under it. A page under a tab has no
 * filters, measure or scope of the tab's, so the surfaces reading the tab's page state stand down
 * there, and a press on the tab's own chip or strip entry goes back to it rather than nowhere.
 */
export const atTabRoot = (pathname: string) => segmentsOf(pathname).filter(Boolean).length <= 1;

export const useCurrentTab = (): Tab => tabForPath(useLocation().pathname);

/** WCAG 2 contrast between two hex colours. */
const contrast = (a: string, b: string) => {
  const luminance = (hex: string) => {
    const [r, g, b] = [0, 1, 2].map((i) => {
      const c = channel(hex, i) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * `colour` moved toward `toward` in the fewest 2% steps that clear `floor` against every ground,
 * so a colour already clearing it comes back unchanged.
 */
const solve = (colour: string, toward: string, floor: number, grounds: readonly string[]): string => {
  for (let step = 0; step <= 50; step++) {
    const candidate = mix(toward, colour, step / 50);
    if (grounds.every((ground) => contrast(candidate, ground) >= floor)) return candidate;
  }
  return toward;
};

// One per franchise visited, so the theme `Google.tsx` caches by tab is built once a franchise.
const franchiseTabs = new Map<string, Tab>();

/**
 * The tab a franchise's own page is drawn in: the Omnibus it stands under, wearing the franchise's
 * colour where the shared table holds one (`franchiseToColour`), so Star Wars' page is gold and
 * Marvel's red. A franchise off the table keeps the Omnibus as it is.
 *
 * Each colour is the table's own, moved only as far as the floors a tab's colours are held to
 * demand (`DarkBar`). The light primary darkens until it clears 3:1 on the white paper, where it
 * draws a lit segment's word and the bar's white text: Pokémon's `#ebbb00` stands at 1.8:1 there,
 * which the table allows for a swatch beside a name and no surface carrying type can. The dark
 * scheme starts from the dark half, the franchise as it is drawn on that paper, and lightens it to
 * the rule's 3:1 and the ink's 4.5:1 against both the tint and the paper. The secondary, the tab
 * strip's indicator, is that ink: one hue on the bar rather than the composing tab's own accent
 * beside a brand it has nothing to do with.
 */
export const franchiseTab = (franchise: string): Tab => {
  const cached = franchiseTabs.get(franchise);
  if (cached) return cached;
  const light = franchiseToColour({ franchise }, "light");
  if (!light) return OmnibusTab;
  const dark = franchiseToColour({ franchise }, "dark");
  const ground = tint(dark);
  const ink = solve(dark, "#ffffff", 4.5, [ground, DARK_PAPER]);
  const themed: Tab = {
    ...OmnibusTab,
    primaryColour: solve(light, "#000000", 3, ["#ffffff"]),
    secondaryColour: ink,
    darkBar: { tint: ground, rule: solve(dark, "#ffffff", 3, [ground, DARK_PAPER]), ink },
  };
  franchiseTabs.set(franchise, themed);
  return themed;
};

/**
 * The tab whose colours the chrome wears: the current tab, or on a franchise's page the Omnibus in
 * the franchise's colour (`franchiseTab`). Read by what paints the theme and the bars; anything asking
 * which tab is open asks `useCurrentTab`, the id being the same either way.
 */
export const useChromeTab = (): Tab => {
  const { pathname } = useLocation();
  const name = franchiseAt(pathname);
  return name ? franchiseTab(name) : tabForPath(pathname);
};

/**
 * The spreadsheet a tab's "Sheet" action opens: its own, or for a tab composing the others the one
 * book every one of them reads. The Omnibus is drawn from four tabs of that book, so the book is
 * what it is showing; tabs reading different books leave no one file to name, and no action.
 */
export const spreadsheetFor = (tab: Tab, tabs: readonly Tab[] = Tabs): string | undefined => {
  if (tab.spreadsheetId) return tab.spreadsheetId;
  const books = new Set(tabs.flatMap((each) => (each.spreadsheetId ? [each.spreadsheetId] : [])));
  return books.size === 1 ? [...books][0] : undefined;
};

/**
 * The tab an id names, for a surface holding a page module or a medium rather than a tab: a module
 * carries `tabId` and never the `Tab` itself, this file importing every tab's entry component
 * eagerly and a module naming its tab closing that cycle.
 *
 * `undefined` where no tab answers to the id, rather than the first tab `tabForPath` falls back to:
 * a path with no tab is a reader who typed one, where an id with no tab is a caller asking about a
 * tab that is not there, and painting its surface in the first tab's colour hides that.
 */
export const tabForId = (id: string): Tab | undefined => Tabs.find((tab) => tab.id === id);

/**
 * The colour a tab is named in away from its own page: the rail's chip for it, where the five of
 * them stand side by side in a row of grey section chips.
 *
 * The primary on the light paper, as the bar is; the bar's `ink` on the dark, where the tint is a
 * fifth of the primary's strength and the primary itself is the value that tint was mixed from —
 * a mark drawn in it on the dark paper is the light bar's colour on the wrong ground. Both clear
 * 3:1 on the paper they are drawn on, which is what a glyph carrying a tab's identity needs.
 */
export const tabInk = (tab: Tab, scheme: Scheme): string | undefined =>
  scheme === "dark" ? tab.darkBar?.ink : tab.primaryColour;

/**
 * Every routed tab as a chip for the section rail, in the array's own order, the one in hand
 * marked `current`.
 *
 * All five rather than the four a reader can go to: the chips are the same five glyphs in the same
 * five places at every scroll position and on every tab, which is what a hand learns. Dropping the
 * current one shifts the other four along by a chip on every navigation, so the position that
 * meant Movies on one page means Books on the next, and the row would have to be read before it
 * can be used.
 *
 * The icon travels with the label because the chip draws the icon alone: five words plus a divider
 * take half a tablet's rail, where five glyphs in five colours say the same thing in a fifth of
 * it. The word stays as the chip's own accessible name.
 */
export const allTabs = (current: Tab, scheme: Scheme, tabs: readonly Tab[] = Tabs) =>
  tabs.map((tab) => ({
    id: tab.id,
    label: tab.name,
    icon: tab.icon,
    colour: tabInk(tab, scheme),
    current: tab === current,
  }));

/**
 * Escape leaves a page standing under a tab — a franchise's, under the Omnibus — as it closes every
 * layer the page opens: back to wherever the reader came from, or to the tab's own page for one
 * opened straight from its address, where back would leave the app. The router's key for the entry
 * says which, `"default"` being the first in the tab.
 *
 * A layer open over the page takes the press first: a dialog, a drill-down or the box stops it
 * there, so one press closes the layer and a second leaves the page. A hover card does not stop it —
 * its tooltip closes on the document's own Escape — so the page stays while a tooltip's popper
 * stands, which MUI mounts only while one is open. A
 * field keeps its own Escape, through the test that holds a typed `/` to a slash.
 */
export const useEscapeLeavesSubPage = () => {
  const navigate = useNavigate();
  const { pathname, key } = useLocation();
  // Read as the press lands rather than subscribed to, so one listener serves the shell's whole life.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (atTabRoot(pathname) || event.key !== "Escape" || event.defaultPrevented) return;
    if (inEditableField(event.target) || document.querySelector(".MuiTooltip-popper")) return;
    if (key === "default") navigate(`/${tabForPath(pathname).id}`);
    else navigate(-1);
  });

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
};

/**
 * The rail's tab chips with their navigation and their colour attached here, where the
 * id-is-a-route convention and the tab registry already live — the rail itself never learns what
 * an id means, and `common/` cannot import this module at all. A jump also starts at the top of
 * the target page: the reader is deep in this one, and a route change alone leaves the scroll
 * offset where it is.
 *
 * The chip for the tab in hand navigates nowhere and scrolls to the top, which is what the bottom
 * bar's own selected action answers a press with: routing to the path already open pushes a second
 * history entry for it, leaving a Back that appears to do nothing.
 */
export const useTabChips = () => {
  const navigate = useNavigate();
  const scheme = useScheme();
  const root = atTabRoot(useLocation().pathname);
  return allTabs(useCurrentTab(), scheme).map((tab) => ({
    ...tab,
    /** The tab's own page is the one open, rather than one standing under it. */
    here: tab.current && root,
    jump: () => jumpToTab(navigate, tab.id, tab.current && root),
  }));
};

/** A jump to a tab's own page, or to the top of it where it is the page open already. */
const jumpToTab = (navigate: NavigateFunction, tabId: string, here: boolean) => {
  if (!here) navigate(`/${tabId}`);
  window.scrollTo({ top: 0 });
};

/**
 * A tab's letter (`Tab.shortcut`) or its place in the strip, `1` to `5`, opens it, and `[` `]` the
 * one either side, wrapping at the ends — each through the rail chip's own jump, so a key for the
 * tab already open scrolls to the top and pushes no second history entry, exactly as pressing its
 * lit chip does. Worked out from the path as the key lands rather than from the chips, which the
 * shell mounting this has no other use for and which would subscribe it to the colour scheme.
 *
 * Bare keys rather than ⌘ and a digit, which every browser spends on its own tabs. Both a letter
 * and a place: the letter is the tab's name, learnt without the sheet, and the place is the strip
 * read left to right, which the brackets walk.
 */
/** Every tab's letter, in the strip's order, so a letter's place in it is its tab's. */
const TAB_LETTERS = Tabs.map((tab) => tab.shortcut).join("");

export const useTabKeys = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  usePageKeys(`123456789[]${TAB_LETTERS}`, (key) => {
    const current = Tabs.indexOf(tabForPath(pathname));
    const at =
      key === "[" || key === "]"
        ? stepIndex(current, key === "]" ? 1 : -1, Tabs.length)
        : /\d/.test(key)
          ? Number(key) - 1
          : TAB_LETTERS.indexOf(key);
    const tab = Tabs[at];
    if (!tab) return false;
    jumpToTab(navigate, tab.id, at === current && atTabRoot(pathname));
    return true;
  });
};

/**
 * The same chips less the one in hand, for the search box's "Go to" line: that line is a list of
 * places to go, where the rail's row is a fixed set of positions, so an entry for the page the box
 * is already standing over is an answer that does nothing.
 */
export const useOtherTabs = () => useTabChips().filter((tab) => !tab.here);

export default Tabs;
