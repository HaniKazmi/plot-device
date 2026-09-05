import "../utils/mapUtils";

/**
 * Groups items by the franchise the accessor names, skipping items it answers `""` for.
 *
 * The accessor is where a domain's own rule about what counts as a franchise lives — a sheet
 * that writes a standalone item's own title in the franchise column answers `""` for those, so
 * they contribute no one-item groups.
 *
 * A page builds this from its **unfiltered** library: a card's franchise strip is about the series,
 * not the current view, so narrowing to one platform or genre must not amputate it. Guest mode is
 * the one narrowing already applied to what a page is handed, since it hides content rather than
 * narrowing a view — an index built before it would put a hidden item straight back on screen
 * through a strip.
 */
export const franchiseIndex = <T>(items: readonly T[], franchiseOf: (item: T) => string) =>
  items.reduce((index, item) => {
    const franchise = franchiseOf(item);
    if (franchise) index.setIfAbsent(franchise, []).push(item);
    return index;
  }, new Map<string, T[]>());
