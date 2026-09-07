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
  /**
   * The category Find is held to, where the reader has named one — the schema field key, so the
   * box asks the index for that category's values and nothing else.
   *
   * It lives here rather than beside the query because the two ways out of it are `closeSearch` and
   * `setSearchMode`, which are already the one place each of those happens: a scope carried in the
   * host would need a third rule saying when it lapses.
   */
  scope: string | null;
}

const store = createStore<SearchState>({ open: false, mode: "find", request: 0, scope: null });

/**
 * The box's next position, asked for by one of the doors below.
 *
 * The scope lapses unless the door says otherwise, which is the default a fifth door should
 * inherit: This page has its own idea of which category is open, and a chip surviving a reopened
 * box is a constraint with nothing on screen saying where it came from. Written once here rather
 * than at each door, since a door added later starts by spreading the state it was handed — which
 * keeps the scope, the wrong answer everywhere but one.
 *
 * The request rises on every one of them: the host mounts the box's chunk from the first request
 * on, so a door that opened the box without counting would leave the flag true with nothing
 * mounted to read it. What the box does with a new count is the mode's business — Find puts the
 * caret back in the field, This page blurs it.
 */
const go = (mode: SearchMode, keepScope = false) => {
  const held = store.get();
  store.set({ open: true, mode, request: held.request + 1, scope: keepScope ? held.scope : null });
};

/**
 * Opens the box in Find, or asks an open one for the caret again.
 *
 * The one door that keeps the scope: the chord selects what is typed inside whatever the box is
 * held to, and a reader who asked for the caret again did not ask to leave the category.
 */
export const openSearch = () => go("find", true);

/** Opens the box on the current page's own settings, keyboard down. */
export const openPage = () => go("page");

/**
 * Switches an open box between its two modes, notifying nobody where it is in that mode already,
 * and opens a closed one in the mode asked for.
 */
export const setSearchMode = (mode: SearchMode) => {
  if (store.get().open && store.get().mode === mode) return;
  go(mode);
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
  store.set({ ...store.get(), open: false, scope: null });
};

/**
 * Holds Find to one category's values, or lets it go.
 *
 * Set from a category hit, cleared by the chip's own ✕, by ⌫ on an empty field and by Escape — the
 * three ways out a chip in a field has anywhere. Notifies nobody where the box is held to that
 * category already, so a second press of the same hit costs no render.
 */
export const setSearchScope = (scope: string | null) => {
  const held = store.get();
  if (held.scope === scope) return;
  store.set({ ...held, scope });
};

/**
 * The box's position without subscribing to it.
 *
 * `useSearchState` is what a component watches; this is what anything outside a render reads — and
 * the whole of what the rules above can be checked through, the mode and the scope lapsing across
 * five entry points that no type catches a missed one in.
 */
export const searchState = () => store.get();

export const useSearchState = () => store.useValue();
