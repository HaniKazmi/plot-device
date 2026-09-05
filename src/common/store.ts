import { useSyncExternalStore } from "react";

/**
 * A value held outside React — `searchOpen.ts` and `filterSheet.ts` are two hand-rolled instances
 * of this same shape, one flag apiece with its own listener set, because each sits between two
 * parts of the tree with no common ancestor short of lifting a re-render onto everything between
 * them. A5 wants five more, one per tab's page state, so the shape is worth a single generic
 * version rather than a sixth (and seventh, and eighth) copy of the bookkeeping.
 *
 * `createStore` reads no browser global at construction — the value and the listener set are
 * plain closed-over variables, nothing reaching for `localStorage` or the like while the module
 * loads. That is what lets a caller create one at module scope (a domain's `filterUtils.ts`, for
 * its page state) without tripping `tests/architecture.test.ts`'s rule against a module-scope read
 * of a browser global: the rule inspects what a module does at load time, and this does nothing
 * more than assign a value and construct a `Set`.
 */
export interface Store<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (onChange: () => void) => () => void;
  useValue: () => T;
}

export const createStore = <T>(initial: T): Store<T> => {
  let value = initial;
  const listeners = new Set<() => void>();

  const get = () => value;

  /** A set to the value already held notifies nobody, the way the filter sheet's own flag does. */
  const set = (next: T) => {
    if (Object.is(next, value)) return;
    value = next;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  };

  // `get` stands in for the server snapshot too: nothing here hydrates (`main.tsx` uses
  // `createRoot`), so the two snapshots are never compared against different renders.
  const useValue = () => useSyncExternalStore(subscribe, get, get);

  return { get, set, subscribe, useValue };
};
