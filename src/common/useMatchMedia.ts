import { useSyncExternalStore } from "react";

/**
 * A media query the app reads as a value, subscribed to so its answer stays live.
 *
 * Two things the page paints from can change under a reader without anything else re-rendering:
 * the system's light/dark setting at dusk, and the primary pointer when a mouse is plugged into a
 * tablet. `useSyncExternalStore` is what turns either into a render — the browser turns CSS
 * variables over where React cannot see them, and no event of React's own fires at all.
 *
 * Stores are kept per query at module scope because `subscribe` has to be the same function across
 * renders: a fresh one each time makes React tear the listener down and put it back on every
 * render. Each store holds **one** `MediaQueryList` with **one** native listener fanned out to a
 * set of callers, because a component asks per instance and a chart is hundreds of them: a list
 * minted inside `subscribe` is a native listener each, and `window.matchMedia` inside the snapshot
 * is an object allocated on every render React takes. The `window` is reached from inside the
 * store rather than at module scope, so importing this module does not require one.
 */
interface MediaStore {
  subscribe: (onChange: () => void) => () => void;
  matches: () => boolean;
}

const stores = new Map<string, MediaStore>();

const storeFor = (query: string): MediaStore => {
  const existing = stores.get(query);
  if (existing) return existing;

  const list = window.matchMedia(query);
  const listeners = new Set<() => void>();
  list.addEventListener("change", () => listeners.forEach((listener) => listener()));

  const store = {
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    matches: () => list.matches,
  };
  stores.set(query, store);
  return store;
};

/** Whether the query matches right now, re-rendering the caller whenever that answer turns over. */
export const useMatchMedia = (query: string) => {
  const store = storeFor(query);
  return useSyncExternalStore(store.subscribe, store.matches);
};
