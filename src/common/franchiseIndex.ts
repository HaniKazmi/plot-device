import "../utils/mapUtils";

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
