import { createContext, useContext } from "react";

/**
 * Franchise siblings for the card strips, threaded down as context.
 *
 * An item names its franchise but carries no pointer to the rest of it, and `common/` is not
 * allowed to reach into a domain for the full list, so each tab builds the index once and
 * provides it above everything that renders cards. A factory rather than one shared context,
 * because each domain's map holds its own item type.
 */
export const createFranchiseContext = <T>() => {
  const FranchiseContext = createContext<Map<string, T[]> | undefined>(undefined);

  /**
   * The items sharing this item's franchise, itself included, or the item alone — which is the
   * answer for an unaffiliated item and for a card rendered with no index above it.
   */
  const useFranchiseItems = (item: T, franchiseOf: (item: T) => string) => {
    const index = useContext(FranchiseContext);
    const franchise = franchiseOf(item);
    return (franchise ? index?.get(franchise) : undefined) ?? [item];
  };

  return { FranchiseContext, useFranchiseItems };
};
