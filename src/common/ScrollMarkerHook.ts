import { useEffect, useState, type RefObject } from "react";
import { SCROLL_MARGIN } from "./SectionRail";

/**
 * The line the marker reads the page at: far enough below the sticky rail that the row it names
 * is one the reader can actually see, and the same line the section itself is measured against so
 * the pill appears exactly when the row it would name is the topmost one.
 */
const READING_LINE = 120;

/** Just clear of the rail, which is the only thing pinned above it. */
export const MARKER_TOP = SCROLL_MARGIN + 8;

/**
 * The narrowest gutter the pill is centred in. Below this the page container has effectively
 * reached the viewport edge, and a centred pill would sit half off the screen.
 */
const MIN_GUTTER = 72;

/** How far inside the container's edge the pill tucks when the gutter is too narrow to hold it. */
const EDGE_INSET = 8;

export type ScrollMarkerState = {
  /** What the topmost visible row is, or `null` when it has no short form. */
  bucket: string | null;
  /** Whether the section is in the reading position at all. */
  visible: boolean;
  /** Viewport pixels from the left edge, to be read with `centred`. */
  left: number;
  /** Whether `left` is the pill's centre (gutter) or its leading edge (container). */
  centred: boolean;
};

/**
 * Where the reader is in a long sorted wall, tracked from scroll position and real geometry.
 *
 * Every answer is a primitive in its own state, so a scroll event that moves the page without
 * changing any of them sets four identical values and re-renders nothing. A single state object
 * would allocate a new one per event and re-render the whole wall on each.
 *
 * The section's own rect supplies the container edge, so the pill follows the page's gutter
 * through every breakpoint without a copy of the container's margins living here.
 */
export const useScrollMarker = (
  section: RefObject<HTMLElement | null>,
  grid: RefObject<HTMLElement | null>,
  sort: string,
  /** The list the grid is currently rendering, watched for identity alone. */
  items: readonly unknown[],
): ScrollMarkerState => {
  const [bucket, setBucket] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [left, setLeft] = useState(0);
  const [centred, setCentred] = useState(false);

  // `sort` and `items` are dependencies because either one rewrites the buckets in the DOM without
  // moving the page — a new sort, or a fetch replacing the cached data under a reader already
  // inside the wall. With no scroll event to follow, the marker would keep naming the old row.
  useEffect(() => {
    const update = () => {
      const root = section.current;
      const cards = grid.current;
      if (!root || !cards) return;

      const rect = root.getBoundingClientRect();
      // In the reading position: its top has passed under the rail, and enough of it is still
      // below that the reader is inside the wall rather than at the far end of it.
      const reading = rect.top < READING_LINE && rect.bottom > window.innerHeight / 2;
      setVisible(reading);
      if (!reading) return;

      const roomy = rect.left >= MIN_GUTTER;
      setCentred(roomy);
      setLeft(roomy ? rect.left / 2 : rect.left + EDGE_INSET);
      setBucket(topmostBucket(cards));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [section, grid, sort, items]);

  return { bucket, visible, left, centred };
};

/**
 * The bucket of the first card still below the reading line, found by binary search.
 *
 * The wall runs to a thousand cards and this answers every scroll event, so measuring each card
 * in turn would be a thousand layout reads a frame. Document order is reading order and cards in
 * a row share an edge, so the rects' bottoms are non-decreasing down the list and the first one
 * past the line can be halved in on instead.
 *
 * Cards with no bucket carry no attribute, so an undated item is skipped by the query rather than
 * filtered out here.
 */
const topmostBucket = (grid: HTMLElement): string | null => {
  const cards = grid.querySelectorAll<HTMLElement>("[data-bucket]");
  let low = 0;
  let high = cards.length - 1;
  let found: HTMLElement | null = null;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const card = cards[mid];
    if (card.getBoundingClientRect().bottom > READING_LINE) {
      found = card;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return found?.dataset.bucket ?? null;
};
