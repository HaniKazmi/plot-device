import type { FunctionComponent } from "react";
import type { Colour, Scheme } from "./utils/types";
import { useLocation, useNavigate } from "react-router-dom";
import Shows from "./show/Show";
import VideoGames from "./vg/vg";
import Movies from "./movie/Movie";
import Books from "./books/Books";
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
 * 4.5:1 and `rule` clears 3:1. `rule` draws a 3px line along the bar's own bottom edge, which is
 * what still separates five tinted bars at a glance; `ink` carries the wordmark and the active
 * tab's own label.
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
  id: string;
  name: string;
  /**
   * The sheet this tab is the dashboard for, absent on a tab that has none of its own. Omnibus
   * composes the three sheets the other tabs already fetch, so a sheet id here would name one of
   * them arbitrarily — and the "Sheet" button in the app bar would send a reader to a third of
   * what they are looking at.
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

export const VideoGamesTab: SheetTab = {
  id: "vg",
  name: "Games",
  spreadsheetId: "1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk",
  range: "Games List!A:Z",
  component: VideoGames,
  primaryColour: "#d019ca",
  secondaryColour: "#14bb7c",
  darkBar: { tint: "#441f4a", rule: "#ea4be4", ink: "#f07aeb" },
};

export const ShowsTab: SheetTab = {
  id: "show",
  name: "Shows",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Shows!A:Z",
  component: Shows,
  primaryColour: "#127d9c",
  secondaryColour: "#fe799b",
  darkBar: { tint: "#1b3540", rule: "#3fb3d3", ink: "#6cc7e0" },
};

export const MoviesTab: SheetTab = {
  id: "movies",
  name: "Movies",
  spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
  range: "Movies!A:Z",
  component: Movies,
  primaryColour: "#de4412",
  secondaryColour: "#499dfe",
  darkBar: { tint: "#472922", rule: "#ff7043", ink: "#ff8f6b" },
};

/**
 * The Books sheet: one row per book, full dates throughout, and a `Banner` column holding a cover
 * URL the way the other sheets' do. The range runs to AZ because the sheet carries thirty-odd
 * provenance columns the converter never reads, and the ones it does read sit among them.
 *
 * The primary is a gold at hue 98 — 3.87 on the white paper and 4.18 on the dark, and 16.7 from
 * the nearest of the other nine values. `mediumColours.book` in `omnibus/types.ts` is the matching
 * medium fill, and the two are chosen together: a book is this gold whether it is a bar on the
 * Omnibus or the bar over it.
 */
export const BooksTab: SheetTab = {
  id: "books",
  name: "Books",
  spreadsheetId: "1qVG5hvXnOynXR4vmiLr6BiOd1CF3jzoytDBwSmeCnwA",
  range: "Books!A:AZ",
  component: Books,
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
 * Every primary clears 3:1 on both papers, because `Google.tsx` writes one hex into both colour
 * schemes and `Barchart` paints a single-group series in `palette.primary.main` — a theme colour is
 * chart geometry, so it is held to the same floor as a `Fill`. The contract test asserts it
 * alongside every other table, which is the only floor under a colour that lives out here on a
 * `Tab` rather than in one of the tables.
 *
 * The medium quartet in `omnibus/types.ts` is chosen from the same five hues, by hand — nothing
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
 */
export const OmnibusTab: Tab = {
  id: "omnibus",
  name: "Omnibus",
  component: Omnibus,
  primaryColour: "#7553ff",
  secondaryColour: "#ef9716",
  darkBar: { tint: "#302c56", rule: "#9d86ff", ink: "#b3a2ff" },
};

/**
 * Omnibus leads the array, which is what puts it at the root route: `App.tsx` renders
 * `Tabs[0].component` for the index route, and `tabForPath` falls back to `tabs[0]` for any path
 * that matches no tab id, root included.
 */
const Tabs: Tab[] = [OmnibusTab, VideoGamesTab, ShowsTab, MoviesTab, BooksTab];

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
 * Every routed tab but the current one, as chips for the section rail — the jumps the rail can
 * offer once the app bar has scrolled away. The current tab is deliberately absent: it is where
 * the reader already is, and the rail offers movement, not orientation.
 */
export const otherTabs = (current: Tab, tabs: readonly Tab[] = Tabs) =>
  tabs.filter((tab) => tab !== current).map((tab) => ({ id: tab.id, label: tab.name }));

/**
 * The rail's tab chips with their navigation attached here, where the id-is-a-route convention
 * already lives — the rail itself never learns what an id means. A jump also starts at the top
 * of the target page: the reader is deep in this one, and a route change alone leaves the
 * scroll offset where it is.
 */
export const useOtherTabs = () => {
  const navigate = useNavigate();
  return otherTabs(useCurrentTab()).map((tab) => ({
    ...tab,
    jump: () => {
      navigate(`/${tab.id}`);
      window.scrollTo({ top: 0 });
    },
  }));
};

export default Tabs;
