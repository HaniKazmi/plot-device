import { useSyncExternalStore } from "react";
import type { Scheme } from "../utils/types";

/** The query the app is actually painted through, so a fill and its paper cannot disagree. */
const PREFERS_DARK = "(prefers-color-scheme: dark)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(PREFERS_DARK);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const darkPaper = () => window.matchMedia(PREFERS_DARK).matches;

/**
 * Which paper the app is currently painting on, for the colour lookups that need to know.
 *
 * Read from the media query rather than from MUI's `mode`, because that is what decides the paint:
 * `Google.tsx` builds the theme with `cssVariables: true` and names no `colorSchemeSelector`, so
 * MUI's default emits the dark palette inside `@media (prefers-color-scheme: dark)` and the system
 * setting picks the surface on its own. `mode` is a separate piece of state MUI restores from a
 * `mui-mode` key in `localStorage`, and the moment anything writes one the two answers part company
 * — every fill on the page would then take the half meant for the other paper, on every render,
 * with nothing on screen to correct it.
 *
 * `useSyncExternalStore` is what re-renders a chart when the reader's system flips at dusk. Without
 * it nothing would: the CSS variables turn over inside the browser, where React cannot see them.
 * The global is read inside the callbacks rather than beside them, so importing this module does
 * not require a `window`.
 */
export const useScheme = (): Scheme => (useSyncExternalStore(subscribe, darkPaper) ? "dark" : "light");
