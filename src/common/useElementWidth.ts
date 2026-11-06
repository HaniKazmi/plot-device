import { useElementReading } from "./useElementReading";

const widthOf = (node: Element) => node.clientWidth;

/**
 * The width an element actually has, kept current as it changes.
 *
 * For a layout that is solved against a width rather than stated at breakpoints — a row of cards
 * that fill a dialog spanning the viewport, where no constant says how wide the row is. Answered
 * as `undefined` until the first measurement, so a caller can render at a known fallback rather
 * than at zero; a layout effect takes the first reading before paint, so that fallback is drawn
 * for no frame the reader sees.
 *
 * `Element` rather than `HTMLElement`, since `clientWidth` is declared there: the packed timeline
 * measures its own `<svg>`, whose internal percentages resolve against exactly this box.
 */
export const useElementWidth = <T extends Element>() => useElementReading<T, number | undefined>(widthOf, undefined);
