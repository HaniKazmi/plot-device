/** How far off its landing line a section still counts as landed, in pixels. */
const LANDED_SLACK = 2;

/**
 * Where `j` and `k` take the reader among a page's sections: the index of the section to bring to
 * its landing line, `-1` for the top of the page, or `undefined` where there is nowhere to go.
 *
 * `tops` are the sections' offsets from the top of the viewport in page order, and `line` is where
 * an anchored section comes to rest — its `scroll-margin-top`. The reader is in the last section
 * whose top has reached the line, give or take the pixel a fractional device pixel ratio leaves a
 * landed section off it, and before the first section they are in the page's opening bands, where `k` goes to the top.
 *
 * `k` inside a section goes to that section's own start before the one above it, as "previous" does
 * in a document: a reader halfway down the library asking to go back wants the library's heading,
 * not the timeline's. `from` is the section a smooth scroll is still travelling to, which is where
 * a second press steps from — the page has not arrived, and stepping from where it is would aim the
 * second press at the same section as the first.
 */
export const sectionStep = (
  tops: readonly number[],
  line: number,
  delta: 1 | -1,
  from?: number,
): number | undefined => {
  const landed = (top: number) => top <= line + LANDED_SLACK;
  const at = from ?? tops.findLastIndex(landed);
  if (delta === 1) return at + 1 < tops.length ? at + 1 : undefined;
  if (at < 0) return from === undefined ? -1 : undefined;
  if (from === undefined && tops[at] < line - LANDED_SLACK) return at;
  return at - 1;
};
