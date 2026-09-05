import { useSyncExternalStore } from "react";

/**
 * A value held outside React, for state two parts of the tree share with no common ancestor short
 * of the shell: the search box's open flag, the filter sheet's, and a page's filter state, which
 * the rail above a tab and the charts inside it both read. Lifted to that common ancestor, every
 * one of them would re-render the whole app on a change that reaches two components.
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
