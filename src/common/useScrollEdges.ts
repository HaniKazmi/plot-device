import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Which ends of a horizontal scroller have content past them.
 *
 * Two rows on the page scroll sideways and hide their scrollbar — the section rail, where a bar
 * under a row of chips costs as much height as the row, and the gallery's shelves, where the strip
 * reserves room for one the platform then declines to draw. macOS Chrome uses overlay scrollbars
 * that appear only while scrolling, and no CSS opts out of that: `scrollbar-width` and
 * `::-webkit-scrollbar` both leave `offsetHeight - clientHeight` at zero. So a row of twenty
 * pictures shows six, and the only thing saying so is that the sixth is cut off.
 *
 * The answer is a pair of booleans rather than a rendered treatment: the callers fade into
 * different grounds — the rail sits on the page, the strips inside a card — and `ScrollFade` is
 * where the painting lives. What is genuinely shared here is the measuring.
 */
export interface ScrollEdges {
  /** Content scrolled off the leading edge, so there is something to go back to. */
  start: boolean;
  /** Content past the trailing edge, which is the one that says a row is longer than it looks. */
  end: boolean;
}

/**
 * A single pixel of slack at each end.
 *
 * `scrollLeft` is fractional under a zoom or a device pixel ratio that is not a whole number, so a
 * row scrolled fully to its end lands a fraction short of `scrollWidth - clientWidth` and an exact
 * comparison leaves the trailing fade lit for ever.
 */
const EDGE_SLACK = 1;

export const useScrollEdges = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  // Each edge is its own state, so a scroll that crosses neither — which is most of them — sets
  // the values already held and re-renders nothing.
  const [start, setStart] = useState(false);
  const [end, setEnd] = useState(false);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    setStart(node.scrollLeft > EDGE_SLACK);
    setEnd(node.scrollLeft + node.clientWidth < node.scrollWidth - EDGE_SLACK);
  }, []);

  // A resize changes both answers without a scroll event: a strip wide enough for its content at
  // one width overflows at another, and the filters rebuild a shelf's contents under it.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  return [ref, { start, end }, measure] as const;
};
