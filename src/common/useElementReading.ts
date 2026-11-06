import { useLayoutEffect, useRef, useState } from "react";

/**
 * A reading taken off an element and kept current as its box resizes: its width, the lines its text
 * runs to.
 *
 * For a layout solved against something only the DOM knows. `read` is the measurement, a function
 * at module scope so the observer is attached once; `initial` is answered until the first reading,
 * which a layout effect takes before paint, so it is drawn for no frame the reader sees.
 *
 * A value in state rather than the observer's entries, so a resize that leaves the reading where it
 * was sets the value already held and re-renders nothing.
 */
export const useElementReading = <T extends Element, V>(read: (node: T) => V, initial: V) => {
  const ref = useRef<T>(null);
  const [value, setValue] = useState<V>(initial);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const take = () => setValue(read(node));
    take();

    const observer = new ResizeObserver(take);
    observer.observe(node);
    return () => observer.disconnect();
  }, [read]);

  return [ref, value] as const;
};
