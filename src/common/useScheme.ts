import type { Scheme } from "../utils/types";
import { useMatchMedia } from "./useMatchMedia";

/** The query the app is actually painted through, so a fill and its paper cannot disagree. */
const PREFERS_DARK = "(prefers-color-scheme: dark)";

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
 * Through `useMatchMedia`, which is what re-renders a chart when the reader's system flips at dusk.
 * Without the subscription nothing would: the CSS variables turn over inside the browser, where
 * React cannot see them.
 */
export const useScheme = (): Scheme => (useMatchMedia(PREFERS_DARK) ? "dark" : "light");
