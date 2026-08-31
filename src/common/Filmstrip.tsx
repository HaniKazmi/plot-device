import { Box, type Theme } from "@mui/material";
import type { ReactNode } from "react";

/**
 * How tall a strip's artwork stands. Exported because the caller sets it on the artwork as well as
 * on the strip: a percentage height inside a card resolves against a box with no height of its
 * own, so the number has to reach the image itself, and one home for it is what keeps a row of
 * mixed artwork on one line.
 */
export const FILMSTRIP_HEIGHT = 150;

/**
 * The room the scrollbar is given, added to the strip's own height rather than taken out of it: a
 * scroll container's bar sits inside its content box, so a strip sized to its artwork exactly
 * would clip the bottom of every picture in it by the width of the bar.
 */
const SCROLLBAR_HEIGHT = 10;

/**
 * A row of artwork at one height, scrolled rather than wrapped or cropped.
 *
 * Height is the only dimension the strip fixes. Width is each child's own, so a 16:9 banner and a
 * 2:3 poster stand side by side at the same height in the shapes they were made in — the rule the
 * whole page follows for mixed media, and the reason this is a strip rather than a grid: a grid
 * cell has a width, and a width plus a height is a crop.
 *
 * Children never shrink, so a strip holding more than the card is wide scrolls sideways. The
 * scrollbar is styled from the theme's own two tokens for the reason the timeline styles its own:
 * styling it at all opts macOS out of overlay scrollbars, which hide the moment scrolling stops,
 * and a thumb that stays says both that there is more and how much at no cost per frame.
 */
export const Filmstrip = ({ height, children }: { height: number; children: ReactNode }) => (
  <Box
    sx={(theme: Theme) => ({
      display: "flex",
      alignItems: "flex-start",
      gap: theme.spacing(1),
      height: height + SCROLLBAR_HEIGHT,
      overflowX: "auto",
      overflowY: "hidden",
      "& > *": { flex: "0 0 auto" },
      scrollbarWidth: "thin",
      scrollbarColor: `${theme.vars.palette.text.secondary} ${theme.vars.palette.divider}`,
      "&::-webkit-scrollbar": { height: SCROLLBAR_HEIGHT },
      "&::-webkit-scrollbar-track": { backgroundColor: theme.vars.palette.divider, borderRadius: 5 },
      "&::-webkit-scrollbar-thumb": { backgroundColor: theme.vars.palette.text.secondary, borderRadius: 5 },
    })}
  >
    {children}
  </Box>
);
