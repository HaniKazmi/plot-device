import { useLayoutEffect, useRef, type RefObject } from "react";
import { keptScrollLeft, scrollPlace, type ScrollPlace } from "./timelineLayout";

/**
 * Holds a sideways scroller on the dates it was showing when its grid is redrawn at another number
 * of screens (`keptScrollLeft`), and answers the function the scroller's own `onScroll` hands each
 * offset to.
 *
 * Left alone, the scroller keeps its offset in pixels, which on a grid twice as wide is a date
 * twice as far back. The place is read as the reader scrolls rather than once the grid has been
 * redrawn, because by then it is gone: a grid drawn narrower than the offset has already had the
 * offset clamped to its new end, which reads as a reader somewhere near the start. It is read
 * through the scroller's own handler rather than a listener this hook attaches, since the chart
 * first renders with no rows and so no scroller, and a listener bound at mount would be bound to
 * nothing. A change to or from the grid fitting its card is left to `useOpenAtLatest`, which opens
 * a scrolling grid at its latest end: a fitted grid has no place to keep.
 *
 * A module of its own because a hook exported from a file of components is a hot-reload boundary
 * the lint rules refuse.
 */
export const useKeepPlace = (ref: RefObject<HTMLDivElement | null>, screens: number) => {
  const previous = useRef<number | undefined>(undefined);
  const place = useRef<ScrollPlace | undefined>(undefined);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = screens;
    const element = ref.current;
    if (!element || before === undefined || before === screens || before === 1 || screens === 1) return;
    if (place.current) element.scrollLeft = keptScrollLeft(place.current, element.clientWidth, element.scrollWidth);
  }, [ref, screens]);

  return (element: HTMLElement) => {
    place.current = scrollPlace(element.scrollLeft, element.clientWidth, element.scrollWidth);
  };
};
