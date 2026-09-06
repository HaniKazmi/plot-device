import { createStore } from "./store";

/**
 * What the box is for when it opens.
 *
 * `find` is the search over the four libraries, opened with the keyboard up: a query answers with
 * works, franchises, the other tabs and the attributes a page can be narrowed by. `page` is the
 * same box holding the current tab's own settings and filters, opened with the keyboard down,
 * because a value there is tapped rather than typed and a keyboard raised over the lists is a
 * keyboard covering what the reader came to press.
 */
export type SearchMode = "find" | "page";

/**
 * Whether the box is open, which of its two modes it is in, and a count of the times it was asked
 * for.
 *
 * The controls that open it are on opposite sides of the tree — the magnifier in the app bar, the
 * population and page chips in the section rail a domain's `Graphs` renders — and the box itself
 * is mounted inside the franchise-union provider, a sibling subtree below the bar. A flag lifted
 * to their nearest common ancestor re-renders the bar, the container and every chart on the page
 * on each open; a store subscribed to by the box alone costs the box a render and nothing else.
 * Nothing persists it: a fresh page starts closed.
 *
 * The count is what makes a second ⌘K do something while the box is already open: the flag alone
 * is already true and a set to the value held notifies nobody, where the box answers a new request
 * by putting the caret back in it and selecting what is there. Every path that opens the box raises
 * it, since the host mounts the box's chunk from the first request on and a path that opened it
 * without counting would leave the flag true with nothing mounted to read it.
 */
export interface SearchState {
  open: boolean;
  mode: SearchMode;
  request: number;
}

const store = createStore<SearchState>({ open: false, mode: "find", request: 0 });

/** Opens the box in Find, or asks an open one for the caret again. */
export const openSearch = () => {
  store.set({ open: true, mode: "find", request: store.get().request + 1 });
};

/**
 * Opens the box on the current page's own settings, keyboard down.
 *
 * The request rises as it does for Find, since a press of the rail's chip on an already-open box
 * has to reach the box for anything to happen at all; what is done with it is the mode's business,
 * and in `page` that is nothing.
 */
export const openPage = () => {
  store.set({ open: true, mode: "page", request: store.get().request + 1 });
};

/**
 * Switches an open box between its two modes, notifying nobody where it is in that mode already,
 * and opens a closed one in the mode asked for.
 *
 * The request rises either way, the host mounting on the count; what the box does with it is the
 * mode's business — Find puts the caret back in the field, This page blurs it, so the keyboard a
 * phone raised for Find comes down with the lists it was covering.
 */
export const setSearchMode = (mode: SearchMode) => {
  const held = store.get();
  if (held.open && held.mode === mode) return;
  store.set({ open: true, mode, request: held.request + 1 });
};

/**
 * Switches an open box to its other mode, and opens a closed one in the mode it is not in.
 *
 * The mode is read here rather than by the caller, so the chord's handler — bound once for the
 * life of the page — cannot answer with whatever mode the box was in when it was attached.
 */
export const toggleSearchMode = () => {
  setSearchMode(store.get().mode === "find" ? "page" : "find");
};

/** Closes the box, notifying nobody when it is closed already. */
export const closeSearch = () => {
  if (!store.get().open) return;
  store.set({ ...store.get(), open: false });
};

export const useSearchState = () => store.useValue();
