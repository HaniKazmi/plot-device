import "../utils/mapUtils";
import type { Predicate } from "../utils/types";

/**
 * Groups items by the franchise the accessor names, skipping items it answers `""` for.
 *
 * The accessor is where a domain's own rule about what counts as a franchise lives — a sheet
 * that writes a standalone item's own title in the franchise column answers `""` for those, so
 * they contribute no one-item groups.
 */
export const franchiseIndex = <T>(items: readonly T[], franchiseOf: (item: T) => string) =>
  items.reduce((index, item) => {
    const franchise = franchiseOf(item);
    if (franchise) index.setIfAbsent(franchise, []).push(item);
    return index;
  }, new Map<string, T[]>());

/**
 * The index a page provides above its cards, built from the unfiltered data: a card's franchise
 * strip is about the series, not the current view, so filtering to one platform or genre must
 * not amputate it. Guest mode is the one exception — it hides content rather than narrowing a
 * view, so it applies here too, or hidden items come straight back on screen through a strip.
 */
export const visibleFranchiseIndex = <T>(
  unfiltered: readonly T[],
  franchiseOf: (item: T) => string,
  guestMode: boolean,
  guestFilter: Predicate<T>,
) => franchiseIndex(guestMode ? unfiltered.filter(guestFilter) : unfiltered, franchiseOf);
