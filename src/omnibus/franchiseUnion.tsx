import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { useLibrary } from "../app/library";
import { CURRENT_PLAINDATE } from "../common/date";
import { FranchiseUnionContext } from "../common/franchiseUnion";
import type { OmniItem } from "./adapter";
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
 * Provides the union to every tab, built from the items the library provider already holds.
 *
 * Mounted above the router because a Star Trek film's card on the Movies tab draws the seasons
 * from the Shows sheet: only the composing tab may import all four domains, and only the shell
 * sits above all four tabs. The items are `undefined` until all four libraries have landed, so the
 * union is too, and a card falls back to the strip its own index draws until then.
 *
 * The union is built from those items rather than from the libraries again: guest mode is applied
 * once, above, and a second flattening here is a second chance to disagree about which rows it
 * hides.
 */
export const FranchiseUnionProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    void loadHoverCard();
  }, []);

  const { items } = useLibrary();
  const union = items ? buildFranchiseUnion(items, CURRENT_PLAINDATE, hoverCard) : undefined;

  return (
    <OmniItemsContext.Provider value={items}>
      <FranchiseUnionContext.Provider value={union}>{children}</FranchiseUnionContext.Provider>
    </OmniItemsContext.Provider>
  );
};
