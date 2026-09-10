/**
 * The coloured mark a legend, a ledger row or a ranked column puts beside a name.
 *
 * Its own module because it is the smallest thing on the page and the most widely wanted: a shell
 * asking for a swatch reaches MUI's `Box` and nothing else — in particular nothing of
 * `TimelineBand.tsx`, whose `Tooltip` brings the Popper engine `tests/architecture.test.ts` pins
 * off the first paint.
 */
import { Box } from "@mui/material";

/**
 * The mark a legend puts beside a name.
 *
 * It appears exactly where the app already speaks that field's colour somewhere else — a platform,
 * a franchise, a genre, a certificate, a status. A swatch on a field with no colour vocabulary invents
 * one, and then the reader has learnt a legend that no chart honours.
 *
 * `size` is the caller's because the mark is read against what it sits beside: 10 on a line of
 * body text, larger in a ranked column where it is the row's leading element.
 */
export const Swatch = ({ colour, size }: { colour: string; size: number }) => (
  <Box
    component="span"
    sx={{
      flexShrink: 0,
      width: size,
      height: size,
      borderRadius: 0.5,
      backgroundColor: colour,
    }}
  />
);

/** A swatch on a line of prose, small enough not to outweigh the text it marks. */
export const INLINE_SWATCH_SIZE = 10;
