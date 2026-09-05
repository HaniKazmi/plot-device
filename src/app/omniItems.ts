import { createContext, useContext } from "react";
import type { OmniItem } from "../common/medium";

/**
 * The union's items, as the library provider builds them and `FranchiseUnionProvider` passes on.
 *
 * The union answers a franchise with entries in the strip's vocabulary and nothing else — no
 * record to open a card from — so a surface above the tabs that lists works, the search palette,
 * reads the items the union was built from rather than flattening the four libraries again. Guest
 * mode is applied to those libraries before either is built, so a hidden item is absent from both.
 * `undefined` until all four libraries have landed, as the union is.
 */
export const OmniItemsContext = createContext<OmniItem[] | undefined>(undefined);

export const useOmniItems = (): OmniItem[] | undefined => useContext(OmniItemsContext);
