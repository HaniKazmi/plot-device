import { useLayoutEffect, type RefObject } from "react";

/**
 * Opens a sideways scroller at its most recent end.
 *
 * Both charts that scroll sideways want it, and for the same reason: the newest data is at the
 * right, and the older end is one drag or one chip away. The browser clamps an over-large
 * `scrollLeft`, so asking for the whole scroll width is the same as asking for the maximum without
 * measuring it.
 *
 * `hasData` is the whole key, and it is a boolean deliberately: a chart renders nothing until it
 * has data, so on a first visit with an empty cache there is no element here to scroll and the
 * opening has to wait for one. Anything finer — a row count, the data array — re-runs on a filter
 * interaction and drags the chart back to the right edge out from under a reader who had scrolled
 * somewhere else.
 *
 * A module of its own because a hook exported from a file of components is a hot-reload boundary
 * the lint rules refuse, which is the same reason `artworkPalette` and `useScrollEdges` have one.
 */
export const useOpenAtLatest = (ref: RefObject<HTMLDivElement | null>, hasData: boolean) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [ref, hasData]);
};
