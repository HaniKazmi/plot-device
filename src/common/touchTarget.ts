/**
 * The smallest thing a finger can reliably hit, which is nothing the charts draw.
 *
 * A strip bead is 8px across, a crossings mark 5×7px, a season band 12px high: every one of them
 * is a mark on a scale, sized by how many have to fit rather than by what can be aimed at, and
 * drawing them at 24 would turn a fifty-entry franchise into a row of buttons.
 */
const TOUCH_TARGET = 24;

/**
 * A 24px-tall hit box centred on a mark, added only where the reader is pointing with a finger.
 *
 * **Height alone.** Marks on one lane are laid out clear of each other but with no guaranteed gap
 * — `buildStrip` tiles an abutting span rather than opening a lane for it — so a box widened to 24
 * reaches over its neighbours, and the later sibling wins every overlap: on the crossings, where
 * fifty-one Marvel entries sit a few pixels apart, a mark drawn at x + 8 swallows the one at x
 * completely and the reader cannot reach it at all. Vertically there is nothing to steal, and
 * vertical is the axis a finger misses on: aiming along a horizontal chain, the reader's error is
 * across it.
 *
 * The `inset` is negative on a mark shorter than 24 and positive on a taller one, so the box is
 * exactly 24 in the first case and inside the mark in the second — and the mark's own box is
 * hit-tested alongside its pseudo-element, so nothing is ever made smaller. Painting nothing, it
 * is invisible either way. A mark inside a container that hides its overflow keeps whatever of the
 * box fits, which is the full height of the track it is drawn in.
 */
export const TOUCH_TARGET_SX = {
  "@media (pointer: coarse)": {
    cursor: "pointer",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: `calc(50% - ${TOUCH_TARGET / 2}px) 0`,
    },
  },
} as const;
