import { useEffect, useRef, useState } from "react";

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

  const read = (node: HTMLElement) => {
    setStart(node.scrollLeft > EDGE_SLACK);
    setEnd(node.scrollLeft + node.clientWidth < node.scrollWidth - EDGE_SLACK);
  };

  // No dependency array, so the answer is re-read after every render. A row's content is what
  // decides it, and content changes by rendering: a filter that replaces a shelf's twenty pictures
  // leaves the strip itself mounted, so an observer bound to the children it had at mount would be
  // watching nodes no longer in the row and would never see the ones that are. Two layout reads
  // after a commit are cheaper than keeping that set in step, and the pair of booleans means a read
  // that finds nothing changed re-renders nothing.
  useEffect(() => {
    if (ref.current) read(ref.current);
  });

  // A resize changes both answers without a render — a strip wide enough for its content at one
  // width overflows at another — and the scroll listener lives here too, so neither is a prop a
  // caller has to thread through its own markup.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => read(node);
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  return [ref, { start, end }] as const;
};
