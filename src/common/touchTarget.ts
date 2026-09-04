/**
 * The smallest thing a finger can reliably hit, which is nothing the charts draw.
 *
 * A strip bead is 8px across, a crossings mark 5×7px, a season band 12px high: every one of them
 * is a mark on a scale, sized by how many have to fit rather than by what can be aimed at, and
 * drawing them at 24 would turn a fifty-entry franchise into a row of buttons.
 */
const TOUCH_TARGET = 24;

/**
 * A hit box of a stated height centred on a mark, added only where the reader is pointing with a
 * finger.
 *
 * **Height alone.** Marks on one lane are laid out clear of each other but with no guaranteed gap
 * — `buildStrip` tiles an abutting span rather than opening a lane for it — so a box widened to 24
 * reaches over its neighbours, and the later sibling wins every overlap: on the crossings, where
 * fifty-one Marvel entries sit a few pixels apart, a mark drawn at x + 8 swallows the one at x
 * completely and the reader cannot reach it at all. Vertical is also the axis a finger misses on:
 * aiming along a horizontal chain, the reader's error is across it.
 *
 * **Which is why the height is stated rather than fixed.** A lane is the same kind of neighbour as
 * a mark to the left, and the same rule decides it: a box taller than the lane it is drawn in
 * reaches into the one below, where the later sibling wins again — a 24px box on a crossings strip
 * 24px tall spans every lane it has, so a two-lane franchise answers both of its marks with the
 * lower one. A caller in a lane passes the lane's own height and gets a box that stops at it;
 * a caller on a single-lane track passes nothing and gets the full 24.
 *
 * The `inset` is negative on a mark shorter than the box and positive on a taller one, so the box
 * is exactly the height asked for in the first case and inside the mark in the second — and the
 * mark's own box is hit-tested alongside its pseudo-element, so nothing is ever made smaller.
 * Painting nothing, it is invisible either way. A mark inside a container that hides its overflow
 * keeps whatever of the box fits, which is the full height of the track it is drawn in.
 *
 * @param height the box's height as a CSS length — a percentage resolves against the mark's own
 *   box, which is how a mark laid out in percentages states the lane holding it.
 */
export const touchTargetSx = (height: string) =>
  ({
    "@media (pointer: coarse)": {
      cursor: "pointer",
      "&::before": {
        content: '""',
        position: "absolute",
        inset: `calc(50% - (${height}) / 2) 0`,
      },
    },
  }) as const;

/** The full reach, for a mark with a track to itself. */
export const TOUCH_TARGET_SX = touchTargetSx(`${TOUCH_TARGET}px`);
