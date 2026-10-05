import { useEffect, useRef, useState } from "react";

/**
 * Whether an element has come within a screen of view, latched once it has: what a long list of
 * expensive rows mounts each row behind, so opening the list costs the rows on screen rather than
 * every row it holds.
 *
 * A screen of margin ahead, so a row is built before the reader reaches it rather than as it
 * arrives. Latched, so a row scrolled past keeps its scroll position and its measured layout
 * rather than being torn down and rebuilt on the way back.
 */
export const useNearScreen = <E extends Element>() => {
  const ref = useRef<E>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (near || !element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  return [ref, near] as const;
};
