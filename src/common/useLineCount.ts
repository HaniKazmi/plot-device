import { useElementReading } from "./useElementReading";

/**
 * Its own box's height over its computed line height, so a clamped heading answers with the lines
 * it shows. One where the line height is not a length.
 */
const lineCountOf = (node: HTMLElement) => {
  const lineHeight = parseFloat(getComputedStyle(node).lineHeight);
  return lineHeight > 0 ? Math.max(1, Math.round(node.getBoundingClientRect().height / lineHeight)) : 1;
};

/**
 * How many lines an element's text runs to, kept current as its width, its font or its text changes.
 *
 * For a layout whose arrangement depends on whether a heading wrapped — which no CSS query can ask,
 * a container query reading the box's size and never the lines inside it. One until the first
 * reading.
 */
export const useLineCount = <T extends HTMLElement>() => useElementReading<T, number>(lineCountOf, 1);
