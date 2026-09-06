/**
 * How much of the row is kept beyond the lit chip, in pixels.
 *
 * A chip brought exactly to an edge reads as the end of the list: the point of moving the row at all
 * is that the reader can see what is on either side of where they are, so the scroll stops with a
 * neighbour's leading edge showing. Roughly a chip's own side padding either side of it.
 */
export const RAIL_FOLLOW_MARGIN = 24;

/**
 * Where a chip row has to stand for the lit chip to be legible, given where it stands now.
 *
 * The nearest offset to the one held that puts the chip and `RAIL_FOLLOW_MARGIN` of its
 * surroundings inside the row: a chip already comfortably in view answers with the offset the row is
 * at, so a rail whose highlight moves between two chips on screen does not move at all. A chip wider
 * than the row less its margins cannot satisfy both bounds, and takes the one that shows its start,
 * which is where its label is.
 *
 * The offset can only be clamped at zero here. The other end — `scrollWidth - clientWidth` — is the
 * browser's own clamp on any scroll, and computing it would mean this function knowing the row's
 * content as well as its box.
 *
 * `chipLeft` is measured from the row's own content origin, so it does not move as the row scrolls.
 */
export const railScrollTarget = (
  scrollLeft: number,
  viewWidth: number,
  chipLeft: number,
  chipWidth: number,
  margin = RAIL_FOLLOW_MARGIN,
) => {
  const atLeast = chipLeft + chipWidth + margin - viewWidth;
  const atMost = chipLeft - margin;
  return Math.max(0, Math.min(Math.max(scrollLeft, atLeast), atMost));
};
