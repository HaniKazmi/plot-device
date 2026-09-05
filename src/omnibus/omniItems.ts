import { createContext, useContext } from "react";
import type { OmniItem } from "./adapter";

/**
 * The union's items, as `FranchiseUnionProvider` computes them on the way to the franchise union.
 *
 * The union answers a franchise with entries in the strip's vocabulary and nothing else — no
 * record to open a card from — so a surface above the tabs that lists works, the search palette,
 * reads the items the provider already built and would otherwise throw away. Guest mode is
 * applied before either is built, so a hidden item is absent from both. `undefined` until all four
 * libraries have landed, as the union is.
 */
export const OmniItemsContext = createContext<OmniItem[] | undefined>(undefined);

export const useOmniItems = (): OmniItem[] | undefined => useContext(OmniItemsContext);
