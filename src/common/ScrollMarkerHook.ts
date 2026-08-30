import { useEffect, useRef, useState, type RefObject } from "react";
import { SCROLL_MARGIN } from "./SectionRail";
import { CHIP_HEIGHT } from "./ChipRail";
import { orderedBuckets } from "./finishedData";
import { scrollBehaviourFor } from "./timelineLayout";

/** Just clear of the rail, which is the only thing pinned above it. */
export const MARKER_TOP = SCROLL_MARGIN + 8;

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
export const CHIP_SLOT = CHIP_HEIGHT + CHIP_GAP;

/** How long the settle loop leaves between measurements, which is long enough for a decoded image to land. */
const SETTLE_STEP = 90;

/**
 * How many corrective scrolls a jump is allowed. A wall whose images are still arriving can be
 * chased indefinitely, and a rail that never stops moving the page is worse than one that lands
 * close and leaves the reader in control.
 *
 * Only a scroll this loop actually issues is spent against it. A tick that finds the page still
 * moving costs nothing, because images streaming in keep the position twitching for many ticks
 * and counting those would spend the whole allowance before a single correction is made.
 */
const SETTLE_LIMIT = 10;

/** How long a jump may keep correcting for, whatever it is doing, in milliseconds. */
const SETTLE_DEADLINE = 2000;

/** How many ticks the loop waits for a moving page before measuring it anyway. */
const SETTLE_WAITS = 6;

/** How far out a landing may be and still count as arrived, in pixels. */
const SETTLE_SLACK = 2;

/**
 * What the reader doing the scrolling themselves looks like.
 *
 * Interference is detected from input and never from the page having moved: content loading above
 * the viewport makes the browser's scroll anchoring adjust the offset to hold the view still, so
 * drift is the very reflow this loop exists to correct rather than evidence of anyone.
 *
 * `mousedown` is here for the scrollbar, which moves the page without any of the other three. It
 * cannot catch the click that starts a jump, since these are attached during that click's own
 * `click` handler, by which point its `mousedown` has already been and gone.
 */
const INPUT_EVENTS = ["wheel", "touchmove", "keydown", "mousedown"] as const;

/** The keys that scroll a page, and so the ones that mean the reader has taken it back. */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

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
  /** Which jump is allowed to move the page, so a settling one stops the moment it is superseded. */
  const jump = useRef(0);

  // A settle loop outlives the click that started it by up to a second, and it scrolls the window
  // rather than anything it owns — an unmounted wall correcting towards a card that has gone would
  // move a page it is no longer on.
  useEffect(() => () => void (jump.current += 1), []);

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
      setRailHeight(window.innerHeight - MARKER_TOP - RAIL_BOTTOM_INSET);
    };

    // Read once per commit rather than per scroll event. The wall runs to a thousand cards, and
    // only a sort or a data change rewrites their labels — both of which land here as a re-run,
    // where a scroll or a resize moves the page without touching one. Comparing the joined labels
    // keeps the re-run free where it changed nothing: a fetch returning the same rows sets the
    // array already held and re-renders nothing, where a fresh array would re-render the wall.
    const cards = grid.current;
    if (cards) {
      const found = orderedBuckets(
        [...cards.querySelectorAll<HTMLElement>("[data-bucket]")].map((card) => card.dataset.bucket),
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBuckets((held) => (held.join("|") === found.join("|") ? held : found));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
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
   * The offset a single measurement gives is not where the card will be. Grid artwork is `loading
   *="lazy"` and carries no reserved height, so a card is nearly flat until its image decodes and
   * takes its own aspect ratio: scrolling into a region makes its images load, the wall grows
   * under the scroll, and the card that was targeted ends up a viewport or more below the landing
   * — clicking '19 from the 2010s arrives in 2021. The offset is only trustworthy once layout has
   * stopped moving, which is what the settle loop below re-measures towards.
   */
  const jumpTo = (target: string) => {
    const cards = grid.current;
    if (!cards) return;
    const first = [...cards.querySelectorAll<HTMLElement>("[data-bucket]")].find(
      (card) => card.dataset.bucket === target,
    );
    if (!first) return;

    const top = window.scrollY + first.getBoundingClientRect().top - MARKER_TOP;
    window.scrollTo({ top, behavior: scrollBehaviourFor(top - window.scrollY, window.innerHeight) });

    // Only the newest jump owns the page: a second chip clicked while the first is still settling
    // would otherwise have two loops correcting towards different cards.
    jump.current += 1;
    const token = jump.current;

    let seen: number | undefined = undefined;
    let waits = 0;
    let corrections = 0;
    const expires = Date.now() + SETTLE_DEADLINE;

    const stop = () => INPUT_EVENTS.forEach((name) => window.removeEventListener(name, taken));
    // The reader reaching for the page ends the jump wherever it has got to, rather than the two
    // of them taking turns at the scroll offset.
    const taken = (event: Event) => {
      if (event.type === "keydown" && !SCROLL_KEYS.has((event as KeyboardEvent).key)) return;
      jump.current += 1;
      stop();
    };
    INPUT_EVENTS.forEach((name) => window.addEventListener(name, taken, { passive: true }));

    const tick = () => {
      if (jump.current !== token) return stop();
      if (Date.now() > expires) return stop();

      const now = window.scrollY;
      // A moving page is worth waiting out — a smooth scroll runs for many frames — but only for
      // so long: anchoring nudges the offset on every image that lands, so a wall still streaming
      // artwork never comes to a complete stop and waiting for one would spend the whole deadline
      // without a single correction. Measuring a page that is still drifting slightly costs
      // nothing, because the next round corrects whatever the drift left behind.
      if (seen === undefined || Math.abs(now - seen) > SETTLE_SLACK) {
        seen = now;
        if (waits < SETTLE_WAITS) {
          waits += 1;
          window.setTimeout(tick, SETTLE_STEP);
          return;
        }
      }
      waits = 0;

      const off = first.getBoundingClientRect().top - MARKER_TOP;
      if (Math.abs(off) <= SETTLE_SLACK || corrections >= SETTLE_LIMIT) return stop();

      corrections += 1;
      seen = undefined;
      // Instant however the jump itself was made: a correction is the same landing arriving at its
      // real offset, and animating it would read as a second jump the reader did not ask for.
      window.scrollTo({ top: now + off, behavior: "auto" });
      window.setTimeout(tick, SETTLE_STEP);
    };

    window.setTimeout(tick, SETTLE_STEP);
  };

  // A rail is an index down the page edge, so it needs both the gutter the pill is centred in and
  // room to spread its chips without them touching. With one bucket there is nowhere to jump.
  const rail = visible && centred && buckets.length > 1 && buckets.length * CHIP_SLOT <= railHeight;

  return { bucket, visible, left, centred, buckets, railHeight, rail, jumpTo };
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
