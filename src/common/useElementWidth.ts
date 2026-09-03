import { useLayoutEffect, useRef, useState } from "react";

/**
 * The width an element actually has, kept current as it changes.
 *
 * For a layout that is solved against a width rather than stated at breakpoints — a row of cards
 * that fill a dialog spanning the viewport, where no constant says how wide the row is. Answered
 * as `undefined` until the first measurement, so a caller can render at a known fallback rather
 * than at zero; a layout effect takes the first reading before paint, so that fallback is drawn
 * for no frame the reader sees.
 *
 * A number in state rather than the observer's entries, so a resize that leaves the width where it
 * was sets the value already held and re-renders nothing.
 */
export const useElementWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const read = () => setWidth(node.clientWidth);
    read();

    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
};
