import { useSyncExternalStore } from "react";

/**
 * Whether the filter surface is open, held outside React.
 *
 * The two controls that open it are on opposite sides of a page's tree: the chip lives in the
 * section rail, which a domain's `Graphs` renders, and the drawer itself is that domain's
 * `Filter`, a sibling of the whole chart tree. Lifting the flag to their nearest common ancestor
 * puts it above every chart on the page, so opening the sheet would re-render all of them; a
 * context threaded from there costs the same, the provider being that same ancestor.
 *
 * A store instead, subscribed to only by the two parts that draw the sheet — which is
 * `useScheme`'s arrangement, for the same reason. Nothing persists it: a fresh page starts closed.
 */
let open = false;

const listeners = new Set<() => void>();

export const subscribeToFilterSheet = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

export const isFilterSheetOpen = () => open;

/**
 * Opens or closes the sheet, notifying nobody when the answer is the one already held: a control
 * saying what is already true costs no render, the way the measure action does.
 */
export const setFilterSheetOpen = (value: boolean) => {
  if (value === open) return;
  open = value;
  listeners.forEach((listener) => listener());
};

export const useFilterSheetOpen = () => useSyncExternalStore(subscribeToFilterSheet, isFilterSheetOpen);
