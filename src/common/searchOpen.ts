import { createStore } from "./store";

/**
 * Whether the search palette is open, held outside React, and a count of the times it was asked
 * for.
 *
 * The button that opens it is in the app bar and the palette itself is mounted inside the
 * franchise-union provider, a sibling subtree below the bar, so the two have no common ancestor
 * short of the whole shell. A flag lifted there re-renders the bar, the container and every tab on
 * each open; a store subscribed to by the palette alone costs the palette a render and nothing
 * else — `filterSheet.ts`'s arrangement, for the same reason. Nothing persists it: a fresh page
 * starts closed.
 *
 * The count is what makes a second ⌘K do something while the box is already open: the flag alone
 * is already true and a set to the value held notifies nobody, where the palette answers a new
 * request by putting the caret back in the box and selecting what is there.
 */
export interface SearchState {
  open: boolean;
  request: number;
}

const store = createStore<SearchState>({ open: false, request: 0 });

/** Opens the palette, or asks an open one for the caret again. */
export const openSearch = () => {
  store.set({ open: true, request: store.get().request + 1 });
};

/** Closes the palette, notifying nobody when it is closed already. */
export const closeSearch = () => {
  if (!store.get().open) return;
  store.set({ ...store.get(), open: false });
};

export const useSearchState = () => store.useValue();
