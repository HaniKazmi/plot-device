import { createStore } from "./store";

/**
 * Whether the filter surface is open, held outside React.
 *
 * The two controls that open it are on opposite sides of a page's tree: the chip lives in the
 * section rail, which a domain's `Graphs` renders, and the drawer itself is a sibling of the whole
 * chart tree. Lifting the flag to their nearest common ancestor puts it above every chart on the
 * page, so opening the sheet would re-render all of them; a context threaded from there costs the
 * same, the provider being that same ancestor.
 *
 * A store instead, subscribed to only by the two parts that draw the sheet — which is
 * `searchOpen.ts`'s arrangement, for the same reason. Nothing persists it: a fresh page starts
 * closed.
 */
const store = createStore(false);

export const subscribeToFilterSheet = store.subscribe;

export const isFilterSheetOpen = store.get;

/**
 * Opens or closes the sheet. A set to the answer already held notifies nobody — the store's own
 * rule — so a control saying what is already true costs no render, the way the measure action does.
 */
export const setFilterSheetOpen = store.set;

export const useFilterSheetOpen = store.useValue;
