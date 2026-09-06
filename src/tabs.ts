import type { FunctionComponent } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import { GridView, MenuBook, SportsEsports, Theaters, Tv } from "@mui/icons-material";
import type { Colour, Scheme } from "./utils/types";
import { useLocation, useNavigate } from "react-router-dom";
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
 * `tint` is a 22% mix of `primaryColour` over that paper, `#1d2126`
 * (`round(0.22 * primary + 0.78 * paper)` per channel): the primary at full strength on dark
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
   * The sheet this tab is the dashboard for, absent on a tab that has none of its own. Omnibus
   * composes the four the other tabs already fetch. They are four tabs of one book now, so an id
   * here would be the right *file* and still the wrong answer: the "Sheet" button opens what a
   * reader is looking at, and on the Omnibus that is all four rather than whichever one a range
   * happened to name.
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
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Games!A:Z",
  component: VideoGames,
  icon: SportsEsports,
  primaryColour: "#d019ca",
  secondaryColour: "#14bb7c",
  darkBar: { tint: "#441f4a", rule: "#ea4be4", ink: "#f07aeb" },
};

export const ShowsTab: SheetTab = {
  id: "shows",
  name: "Shows",
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Shows!A:Z",
  component: Shows,
  icon: Tv,
  primaryColour: "#127d9c",
  secondaryColour: "#fe799b",
  darkBar: { tint: "#1b3540", rule: "#3fb3d3", ink: "#6cc7e0" },
};

export const MoviesTab: SheetTab = {
  id: "movies",
  name: "Movies",
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Movies!A:Z",
  component: Movies,
  icon: Theaters,
  primaryColour: "#de4412",
  secondaryColour: "#499dfe",
  darkBar: { tint: "#472922", rule: "#ff7043", ink: "#ff8f6b" },
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
  spreadsheetId: "1Zv8WAq1KA9L95ooQ3aiTOD1-0QrD1IPrEf4Mixgp9o0",
  range: "Books!A:Z",
  component: Books,
  icon: MenuBook,
  primaryColour: "#958112",
  secondaryColour: "#ca82fe",
  darkBar: { tint: "#373622", rule: "#c7b143", ink: "#d6c45a" },
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
  component: Omnibus,
  icon: GridView,
  primaryColour: "#7553ff",
  secondaryColour: "#ef9716",
  darkBar: { tint: "#302c56", rule: "#9d86ff", ink: "#b3a2ff" },
};

/**
 * Omnibus leads the array, which is what puts it at the root route: `App.tsx` renders
 * `Tabs[0].component` for the index route, and `tabForPath` falls back to `tabs[0]` for any path
 * that matches no tab id, root included.
 */
const Tabs: Tab[] = [OmnibusTab, GamesTab, ShowsTab, MoviesTab, BooksTab];

/**
 * The tab a route belongs to, falling back to the first one.
 *
 * The match is an exact, case-sensitive comparison against the tab id after a single leading
 * slash is stripped, so a trailing slash or any nested path falls back rather than matching.
 */
export const tabForPath = (pathname: string, tabs: readonly Tab[] = Tabs): Tab =>
  tabs.find((tab) => tab.id === pathname.replace(/^\//, "")) ?? tabs[0];

export const useCurrentTab = (): Tab => tabForPath(useLocation().pathname);

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
  return allTabs(useCurrentTab(), scheme).map((tab) => ({
    ...tab,
    jump: () => {
      if (!tab.current) navigate(`/${tab.id}`);
      window.scrollTo({ top: 0 });
    },
  }));
};

/**
 * The same chips less the one in hand, for the search box's "Go to" line: that line is a list of
 * places to go, where the rail's row is a fixed set of positions, so an entry for the page the box
 * is already standing over is an answer that does nothing.
 */
export const useOtherTabs = () => useTabChips().filter((tab) => !tab.current);

export default Tabs;
