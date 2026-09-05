import { lazy, Suspense, useEffect, type ReactNode } from "react";
import useData from "../common/useData";
import { CURRENT_PLAINDATE } from "../common/date";
import { FranchiseUnionContext } from "../common/franchiseUnion";
import { BooksTab, MoviesTab, ShowsTab, VideoGamesTab } from "../tabs";
import { bookDataConfig } from "../books/converter";
import { movieDataConfig } from "../movie/converter";
import { showDataConfig } from "../show/converter";
import { vgDataConfig } from "../vg/converter";
import { toOmniItems, visibleLibrary, type OmniItem } from "./adapter";
import { buildFranchiseUnion } from "./franchiseUnionData";
import { OmniItemsContext } from "./omniItems";

/**
 * The hover card, loaded with the chunk that draws it rather than with the shell.
 *
 * This provider mounts above every tab, so what it imports at module scope is in the first bundle
 * a visitor downloads. The four domains' cards and everything they draw with are in the tabs'
 * lazy chunks, and a thunk keeps them there. The provider starts the download on mount all the
 * same: a tooltip is positioned once, when it opens, and a card that resolved into an open tooltip
 * would grow from an anchor placed for nothing, over the bead it belongs to. Module scope rather
 * than inside the component, because the React Compiler cannot lower an import expression.
 */
const loadHoverCard = () => import("./CardMediaImage");
const OmniHoverCard = lazy(() => loadHoverCard().then((module) => ({ default: module.OmniHoverCard })));

const hoverCard = (item: OmniItem) => () => (
  <Suspense fallback={null}>
    <OmniHoverCard item={item} />
  </Suspense>
);

/**
 * Provides the union to every tab, built from the four libraries through their own configs.
 *
 * Mounted above the router because a Star Trek film's card on the Movies tab draws the seasons
 * from the Shows sheet: only the composing tab may import all four domains, and only the shell
 * sits above all four tabs. `useData` keeps one module-level cache per sheet and skips the fetch on
 * a hit, and the Omnibus is the tab a bare visit opens on, so on the common path a home tab reaches
 * the union with nothing left to fetch; a deep link straight to a home tab pays three extra sheet
 * reads, painting from the previous visit's cached copy until they land. Until all four are here
 * the value is `undefined`, and a card falls back to the strip its own index draws.
 *
 * Guest mode is applied per library by each domain's own rule, the way the Omnibus applies it, so
 * a hidden game cannot come back on screen as a bead in a film's franchise.
 */
export const FranchiseUnionProvider = ({ guestMode, children }: { guestMode: boolean; children: ReactNode }) => {
  useEffect(() => {
    void loadHoverCard();
  }, []);

  const [games] = useData(vgDataConfig, VideoGamesTab);
  const [shows] = useData(showDataConfig, ShowsTab);
  const [movies] = useData(movieDataConfig, MoviesTab);
  const [books] = useData(bookDataConfig, BooksTab);

  // The items are built once here and the union from them, rather than the union from the
  // library on its own: the palette above the tabs lists the same items, and two flattenings of
  // one library are two chances to disagree about which rows guest mode hides.
  const items =
    games && shows && movies && books
      ? toOmniItems(visibleLibrary({ games, shows, movies, books }, guestMode))
      : undefined;
  const union = items ? buildFranchiseUnion(items, CURRENT_PLAINDATE, hoverCard) : undefined;

  return (
    <OmniItemsContext.Provider value={items}>
      <FranchiseUnionContext.Provider value={union}>{children}</FranchiseUnionContext.Provider>
    </OmniItemsContext.Provider>
  );
};
