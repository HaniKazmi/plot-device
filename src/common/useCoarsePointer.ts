import { useMatchMedia } from "./useMatchMedia";

/**
 * The primary pointer, which is what decides whether hovering is a thing the reader can do.
 *
 * `(hover: hover)` answers whether a hover is *possible*; this one answers how precisely the
 * reader can aim, which is the question a hit target and a tap-to-open surface are asking.
 */
const COARSE = "(pointer: coarse)";

/**
 * Whether the reader is pointing with a finger.
 *
 * A component asks this where the difference is structural rather than a matter of styling: a
 * hover card is a popper on a mouse and a bottom sheet on a phone, and the two are different
 * trees with different state. Anything that is only a rule — a hit area, a hover treatment, a
 * cursor — belongs in `sx` as `@media (pointer: coarse)` instead, where it costs no subscription
 * and no render.
 *
 * Through `useMatchMedia` for the subscription: a tablet with a mouse plugged in changes the answer
 * while the page is open, and nothing else would re-render the charts.
 */
export const useCoarsePointer = () => useMatchMedia(COARSE);
