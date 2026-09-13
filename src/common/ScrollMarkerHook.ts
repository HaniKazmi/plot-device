import { useEffect, useRef, useState, type RefObject } from "react";
import { SCROLL_MARGIN } from "./SectionRail";
import { orderedBuckets } from "./finishedData";
import { scrollBehaviourFor } from "./timelineLayout";
import { RAIL_CHIP_HEIGHT } from "./typography";

/**
 * Just clear of the rail, which is the only thing pinned above it — from `sm` up, the width the pill
 * and the jump rail this positions are mounted at. Below it the wall indexes itself with sticky
 * headings instead, which clear the phone's own smaller margin.
 */
export const MARKER_TOP = SCROLL_MARGIN + 8;

/**
 * Where the position marker sits in the page's stack: over the wall it indexes, under the rail it
 * hangs from and the dialogs that cover the page.
 *
 * Named rather than written at each of the two presentations, which are alternatives and so are
 * never seen together — the one place a difference between them could go unnoticed indefinitely.
 * The full order, lowest first: a scroller's fade (`FADE_Z`), anything pinned inside that scroller
 * (`FADE_Z + 1`), this, then the section rail.
 */
export const MARKER_Z = (theme: { zIndex: { appBar: number } }) => theme.zIndex.appBar - 2;

/**
 * How far past a landed card's top edge the reading line falls.
 *
 * `jumpTo` brings a card's top to rest at `MARKER_TOP`, and `topmostBucket` names the first card
 * whose bottom is still below the reading line, so the two agree only while a card is taller than
 * this: a shorter one would land entirely above the line and the marker would name the row after
 * it, leaving a chip lit that is not the one clicked. Grid cards are artwork and never this flat.
 */
const CARD_DEPTH = 40;

/**
 * The line the marker reads the page at: far enough below the sticky rail that the row it names
 * is one the reader can actually see, and the same line the section itself is measured against so
 * the pill appears exactly when the row it would name is the topmost one.
 */
const READING_LINE = MARKER_TOP + CARD_DEPTH;

/**
 * The narrowest gutter the pill is centred in. Below this the page container has effectively
 * reached the viewport edge, and a centred pill would sit half off the screen.
 */
const MIN_GUTTER = 72;

/** How far inside the container's edge the pill tucks when the gutter is too narrow to hold it. */
const EDGE_INSET = 8;

/** Where the rail stops short of the viewport's bottom edge, so it reads as a column and not a fill. */
const RAIL_BOTTOM_INSET = 16;

/** The smallest gap between two chips that still reads as two targets rather than a stack. */
const CHIP_GAP = 6;

/**
 * The least height one rail chip needs: the chip itself plus that gap. Below this the chips touch,
 * so a rail that would need less falls back to the pill rather than shrinking into an unreadable
 * stack.
 */
const CHIP_SLOT = RAIL_CHIP_HEIGHT + CHIP_GAP;

/**
 * How far a card's top may sit from `MARKER_TOP` and still count as the row the marker stands on.
 * A jump lands a card at that offset to within the browser's own rounding, and the first bucket's
 * card is the top of the grid itself, so a strict test hides the rail on exactly the position
 * pressing its first chip lands at.
 */
const LANDING_SLACK = 2;

export type ScrollMarkerState = {
  /** What the topmost visible row is, or `null` when it has no short form. */
  bucket: string | null;
  /** Whether the section is in the reading position at all. */
  visible: boolean;
  /** Viewport pixels from the left edge, to be read with `centred`. */
  left: number;
  /** Whether `left` is the pill's centre (gutter) or its leading edge (container). */
  centred: boolean;
  /** Every bucket the wall holds, at first appearance, in wall order. */
  buckets: string[];
  /** The vertical span the rail is spread across, from under the section rail to near the fold. */
  railHeight: number;
  /** Whether the rail is the presentation to use; the pill is what stands in when it is not. */
  rail: boolean;
  /** Bring a bucket's first card to rest just under the section rail. */
  jumpTo: (bucket: string) => void;
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
  const [buckets, setBuckets] = useState<string[]>([]);
  const [railHeight, setRailHeight] = useState(0);
  /**
   * The wall's cards in document order, queried once per commit rather than per scroll event.
   *
   * A scroll or a resize moves the page without changing which cards are on it: only a new sort,
   * new data or a mount rewrites them, and each of those lands as a re-run of the effect below,
   * which is where this is refilled.
   */
  const wall = useRef<HTMLElement[]>([]);

  // `sort` and `items` are dependencies because either one rewrites the buckets in the DOM without
  // moving the page — a new sort, or a fetch replacing the cached data under a reader already
  // inside the wall. With no scroll event to follow, the marker would keep naming the old row.
  useEffect(() => {
    const update = () => {
      const root = section.current;
      const cards = grid.current;
      if (!root || !cards) return;

      const rect = root.getBoundingClientRect();
      // In the reading position: its top has passed under the rail, enough of it is still below
      // that the reader is inside the wall rather than at the far end of it, and the cards
      // themselves have reached the line the marker stands on.
      //
      // That last test is what keeps the pill off the section's own header. The pill is fixed at
      // `MARKER_TOP` and the header sits between the section's top edge and the first row of cards,
      // so anywhere the gutter is too narrow to centre the pill in — every width below about
      // 1,630px — it would otherwise be painted over the title for the hundred pixels of scroll
      // between the section arriving and the wall arriving. Measuring the wall instead means the
      // marker appears exactly when there is a row for it to name.
      //
      // The landing counts as arrived, which is what `LANDING_SLACK` allows for.
      const reading =
        rect.top < READING_LINE &&
        rect.bottom > window.innerHeight / 2 &&
        cards.getBoundingClientRect().top <= MARKER_TOP + LANDING_SLACK;
      setVisible(reading);
      if (!reading) return;

      const roomy = rect.left >= MIN_GUTTER;
      setCentred(roomy);
      setLeft(roomy ? rect.left / 2 : rect.left + EDGE_INSET);
      setBucket(topmostBucket(wall.current));
      setRailHeight(window.innerHeight - MARKER_TOP - RAIL_BOTTOM_INSET);
    };

    // Read once per commit rather than per scroll event. The wall runs to a thousand cards, and
    // only a sort or a data change rewrites their labels — both of which land here as a re-run,
    // where a scroll or a resize moves the page without touching one. Comparing the joined labels
    // keeps the re-run free where it changed nothing: a fetch returning the same rows sets the
    // array already held and re-renders nothing, where a fresh array would re-render the wall.
    const cards = grid.current;
    if (cards) {
      wall.current = [...cards.querySelectorAll<HTMLElement>("[data-bucket]")];
      const found = orderedBuckets(wall.current.map((card) => card.dataset.bucket));
      setBuckets((held) => (held.join("|") === found.join("|") ? held : found));
    }

    // Every answer `update` reads is a paint-time one, and a scroll delivers events faster than
    // the page paints: a trackpad flick is well over a hundred a second, each spending a rect read
    // on the section, one on the grid and a binary search's worth on a wall that runs to a
    // thousand cards. Coalescing to one run a frame asks the same question as often as the answer
    // can change, and holds the reads to a single point in the frame — after style has settled,
    // rather than interleaved with the renders each arriving lazy image sets off.
    let queued = 0;
    const schedule = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        update();
      });
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (queued) cancelAnimationFrame(queued);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [section, grid, sort, items]);

  /**
   * The card scrolled to lands with its top at `MARKER_TOP` and so its bottom past the reading
   * line, which is what makes the marker name the bucket that was clicked: the jump and the
   * highlight read the same geometry rather than the click setting the highlight directly.
   *
   * Cards are walked rather than selected by attribute, so a bucket's label never has to be a
   * valid CSS string — it is whatever the domain's items yield.
   *
   * One scroll and no correction afterwards. The grid reserves every card's height before its
   * artwork arrives (`Finished`'s `aspectRatio`), so the offset measured here is the offset the
   * card keeps; what a landing can still be off by is a cover a few percent from 2:3 or a footer
   * that wraps, a row at most, on Books alone.
   */
  const jumpTo = (target: string) => {
    const first = wall.current.find((card) => card.dataset.bucket === target);
    if (!first) return;

    const top = window.scrollY + first.getBoundingClientRect().top - MARKER_TOP;
    window.scrollTo({ top, behavior: scrollBehaviourFor(top - window.scrollY, window.innerHeight) });
  };

  // A rail is an index down the page edge, so it needs both the gutter the pill is centred in and
  // room to spread its chips without them touching. With one bucket there is nowhere to jump.
  const rail = visible && centred && buckets.length > 1 && buckets.length * CHIP_SLOT <= railHeight;

  return { bucket, visible, left, centred, buckets, railHeight, rail, jumpTo };
};

/** Two cards whose tops sit within this of each other share a row. */
const ROW_EPSILON = 2;

/**
 * The bucket of the reading row's last card, with the row found by binary search.
 *
 * The wall runs to a thousand cards and this answers every scroll event, so measuring each card
 * in turn would be a thousand layout reads a frame. Document order is reading order and cards in
 * a row share an edge, so the rects' bottoms are non-decreasing down the list and the first one
 * past the line can be halved in on instead.
 *
 * The row's LAST card is the one that names it, because a bucket boundary falls mid-row for most
 * buckets: the row a jump lands at the top then opens with the previous bucket's spill and ends
 * in the one that was clicked, and naming the leading card would light the chip beside the one
 * the reader pressed. Walking to the row's end costs at most a column count of extra reads.
 *
 * Cards with no bucket carry no attribute, so an undated item is skipped by the query rather than
 * filtered out here.
 */
const topmostBucket = (cards: readonly HTMLElement[]): string | null => {
  let low = 0;
  let high = cards.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const card = cards[mid];
    if (card.getBoundingClientRect().bottom > READING_LINE) {
      found = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  if (found < 0) return null;

  const rowTop = cards[found].getBoundingClientRect().top;
  let last = found;
  while (last + 1 < cards.length && Math.abs(cards[last + 1].getBoundingClientRect().top - rowTop) <= ROW_EPSILON) {
    last += 1;
  }

  return cards[last].dataset.bucket ?? null;
};
