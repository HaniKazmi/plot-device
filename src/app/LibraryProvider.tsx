import { useEffect, type ReactNode } from "react";
import { bookModule } from "../books/module";
import type { MediumModule } from "../common/medium";
import useData from "../common/useData";
import { movieModule } from "../movie/module";
import { showModule } from "../show/module";
import Tabs, { type SheetTab } from "../tabs";
import { vgModule } from "../vg/module";
import { completeLibrary, LibraryContext, toOmniItems, visibleLibrary, type Library } from "./library";
import { retainPageSelections } from "./pageState";

/**
 * The tab a module names, which is the sheet `useData` reads.
 *
 * The one resolution of an id to a tab in the app, and the reason a `MediumModule` carries an id
 * and not a `Tab`: `tabs.ts` imports the five entry components eagerly and an entry component
 * reaches the registry, so a module naming its tab would evaluate the registry while `tabs.ts` was
 * still in its own temporal dead zone. This component is mounted by the shell, below both, and the
 * lookup runs from a render rather than at module load for exactly the same reason.
 *
 * `Tabs` is a module constant, so the tab found is the same object on every render — which is what
 * keeps it out of `useData`'s fetch effect as a fresh dependency each time. A module naming a tab
 * that holds no sheet is a registry that cannot work at all, so it fails loudly here.
 */
const sheetFor = (tabId: string): SheetTab => {
  const tab = Tabs.find((candidate) => candidate.id === tabId);
  if (!tab?.spreadsheetId || !tab.range) throw new Error(`No sheet for tab id "${tabId}"`);
  return tab as SheetTab;
};

const useSheet = <T,>(module: MediumModule<T, unknown>) => useData(module.data, sheetFor(module.tabId));

/**
 * The four sheets, fetched once above every tab.
 *
 * Mounted inside the auth provider and above the bar, so everything on the page — a tab, the bar,
 * the search palette, a card's franchise strip across all four media — reads one copy of the
 * library. `useData` keeps a module-level cache and one in-flight promise per sheet, so this is not
 * what stops a second read; what it buys is that guest mode is applied once, the union is built
 * once, and a surface above the tabs can ask what the library holds.
 *
 * Every visit therefore pays four sheet reads, including a deep link straight to one tab: a card on
 * any tab draws its franchise across all four media, and the Omnibus — which a bare visit opens on
 * — needs all four anyway. The cost is a returning visitor's three extra reads behind a page that
 * has already painted from cache.
 *
 * The four calls are written out rather than walked over the registry because a hook called in a
 * loop or a callback is a rules-of-hooks error. Each is typed for its own medium's records, which
 * is what makes the object below a `Partial<Library>` with nothing asserted into it.
 */
export const LibraryProvider = ({ guestMode, children }: { guestMode: boolean; children: ReactNode }) => {
  const [games, gamesLoaded, gamesError] = useSheet(vgModule);
  const [shows, showsLoaded, showsError] = useSheet(showModule);
  const [movies, moviesLoaded, moviesError] = useSheet(movieModule);
  const [books, booksLoaded, booksError] = useSheet(bookModule);

  const raw: Partial<Library> = { game: games, show: shows, movie: movies, book: books };
  const visible = visibleLibrary(raw, guestMode);
  const whole = completeLibrary(visible);
  const items = whole && toOmniItems(whole);

  // Every tab's selects are drawn from the library this provider hands down, so a selection made
  // against a wider library has to be held to the narrower one: guest mode switched on under a
  // chosen franchise otherwise leaves that choice in the tab's store with no control still offering
  // it, and the page reads as empty for no reason a reader can see or undo. Run from an effect
  // because it writes to stores every tab subscribes to.
  useEffect(() => {
    retainPageSelections(visible, items);
  }, [visible, items]);

  const value = {
    raw,
    visible,
    whole,
    items,
    loaded: { game: gamesLoaded, show: showsLoaded, movie: moviesLoaded, book: booksLoaded },
    error: { game: gamesError, show: showsError, movie: moviesError, book: booksError },
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};
