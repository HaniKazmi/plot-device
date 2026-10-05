import { createStore } from "./store";

/**
 * A value whose layer was asked for — a genre, a platform, a director named anywhere in the app —
 * and a count of the times one was, so the same value pressed twice opens it twice.
 *
 * The layer is the one the search box opens for a value it finds: every work carrying it across
 * the four libraries, and the tabs it can narrow. The box holds the index that knows which works
 * those are and draws the layer, and the names that open it stand on every tab and inside every
 * card, so the request crosses the tree through a store rather than a context: a press costs the
 * host a render and nothing else, and nothing on the page subscribes to it.
 */
export interface ValueRequest {
  /** The filter category the value belongs to — the schema key every tab keys it on. */
  category: string;
  value: string;
  count: number;
}

const store = createStore<ValueRequest | null>(null);

/** Opens the layer of everything carrying a value. */
export const openValue = (category: string, value: string) =>
  store.set({ category, value, count: (store.get()?.count ?? 0) + 1 });

export const useValueRequest = () => store.useValue();
