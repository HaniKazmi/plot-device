import { Box, useTheme, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { scrollbarSx } from "./scrollbarSx";
import { ScrollFade } from "./ScrollFade";
import { useScrollEdges } from "./useScrollEdges";

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
export const Filmstrip = ({ height, children }: { height: number; children: ReactNode }) => {
  // The scrollbar this strip reserves room for is drawn by some platforms and not others, so the
  // fade rather than the bar is what tells a reader six of twenty pictures are on screen.
  const [ref, edges] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();

  return (
    <ScrollFade
      edges={edges}
      ground={theme.vars.palette.background.paper}
    >
      <Box
        ref={ref}
        sx={(theme: Theme) => ({
          display: "flex",
          alignItems: "flex-start",
          gap: theme.spacing(1),
          height: height + SCROLLBAR_HEIGHT,
          overflowX: "auto",
          overflowY: "hidden",
          // A flick that reaches the end of the row otherwise carries on into the browser's own
          // back gesture, so the reader leaves the page while reaching for the next picture.
          overscrollBehaviorX: "contain",
          // The children are given the artwork's height rather than left to ask for the strip's. A
          // card is `height: 100%`, and 100% of this box is the row plus the scrollbar's allowance
          // — so the card stands ten pixels taller than the picture inside it and paints its own
          // ground under every one of them. Stating the height here is what keeps the strip's one
          // fixed dimension the artwork's and not the box's.
          //
          // `&&` rather than `&` because a card carries the same rule about itself: one class each,
          // so the two selectors tie on specificity and the later-inserted one wins — and a child's
          // class is inserted after its parent's. Naming this class twice settles the tie by weight
          // rather than by render order.
          "&& > *": { flex: "0 0 auto", height },
          ...scrollbarSx(theme, SCROLLBAR_HEIGHT),
        })}
      >
        {children}
      </Box>
    </ScrollFade>
  );
};
