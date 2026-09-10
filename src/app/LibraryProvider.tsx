import { useEffect, type ReactNode } from "react";
import { bookModule } from "../book/module";
import type { MediumModule } from "../common/medium";
import type { Medium } from "../utils/types";
import useData from "../common/useData";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import { movieModule } from "../movie/module";
import { showModule } from "../show/module";
import Tabs, { type SheetTab } from "../tabs";
import { MEDIA as MEDIA_ORDER } from "../utils/types";
import { gameModule } from "../game/module";
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
 * Every visit therefore reads all four ranges, including a deep link straight to one tab: a card on
 * any tab draws its franchise across all four media, and the Omnibus — which a bare visit opens on
 * — needs all four anyway. The cost is three ranges a returning visitor is not looking at, read in
 * the same request as the one they are, behind a page that has already painted from cache.
 *
 * The four calls are written out rather than walked over the registry because a hook called in a
 * loop or a callback is a rules-of-hooks error. Each is typed for its own medium's records, which
 * is what makes the object below assignable with nothing asserted into it. Its type makes every
 * key required and only the value optional — `Partial<Library>` would let a fifth medium's slice
 * be left out and compile, where `completeLibrary` then answers `undefined` for good and the union
 * never builds, while `loaded` reports that sheet arrived.
 */
export const LibraryProvider = ({ guestMode, children }: { guestMode: boolean; children: ReactNode }) => {
  const [games, gamesLoaded, gamesError, refetchGames] = useSheet(gameModule);
  const [shows, showsLoaded, showsError, refetchShows] = useSheet(showModule);
  const [movies, moviesLoaded, moviesError, refetchMovies] = useSheet(movieModule);
  const [books, booksLoaded, booksError, refetchBooks] = useSheet(bookModule);
  const { apiReady } = useGoogleAuth();

  const raw: { [M in Medium]: Library[M] | undefined } = { game: games, show: shows, movie: movies, book: books };
  const loaded = { game: gamesLoaded, show: showsLoaded, movie: moviesLoaded, book: booksLoaded };
  const error = { game: gamesError, show: showsError, movie: moviesError, book: booksError };
  const visible = visibleLibrary(raw, guestMode);
  const whole = completeLibrary(visible);
  const items = whole && toOmniItems(whole);

  // Every tab's selects are drawn from the library this provider hands down, so a selection made
  // against a wider library has to be held to the narrower one: guest mode switched on under a
  // chosen franchise otherwise leaves that choice in the tab's store with no control still offering
  // it, and the page reads as empty for no reason a reader can see or undo. Run from an effect
  // because it writes to stores every tab subscribes to.
  useEffect(() => {
    retainPageSelections({ visible, items });
  }, [visible, items]);

  const value = {
    raw,
    visible,
    whole,
    items,
    loaded,
    error,
    // Named one at a time because four separately-bound callbacks are not a collection to walk —
    // a consequence of the `useSheet` calls above, where the rule against a hook in a loop is what
    // writes them out. These are plain functions and could be looped over given an array to loop.
    refresh: () => {
      refetchGames();
      refetchShows();
      refetchMovies();
      refetchBooks();
    },
    // A read is out wherever a medium has neither landed nor failed, which is a walk over the two
    // records above rather than their eight parts again: destructured by hand, a fifth medium is
    // silently absent from the answer and nothing fails to compile over it.
    reading: apiReady && MEDIA_ORDER.some((medium) => !loaded[medium] && !error[medium]),
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};
