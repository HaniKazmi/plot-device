import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode, Ref } from "react";
import type { ScrollEdges } from "./useScrollEdges";

/** How much of each end the fade covers, and how far above the content it is painted. */
const FADE_WIDTH = 32;
export const FADE_Z = 1;

/**
 * The ends of a horizontal scroller, faded where there is content past them.
 *
 * A wrapper with two overlays rather than anything on the scroller itself, because the scroller
 * cannot paint over its own content: a background and an inset shadow are both painted before its
 * children, so a shadow at the edge tints the gaps between marks and leaves every mark crisp on
 * top of it — visible on an empty row and invisible on the dense one the fade exists for. A mask
 * has the opposite problem: it takes the element's own background with it, and a scroller pinned
 * over the page would let the content beneath show through the gap. An absolutely positioned
 * sibling after the scroller is painted over it and touches neither.
 *
 * The overlays are `aria-hidden` and take no pointer events: they are the edge of a scroll, which
 * a keyboard or a screen reader reaches through the scroller itself.
 */
export const ScrollFade = ({
  edges,
  ground,
  sx,
  ref,
  children,
}: {
  edges: ScrollEdges;
  /** The colour the content fades into — the page's ground, or the card's. */
  ground: string;
  sx?: SxProps<Theme>;
  /** Forwarded to the wrapper, which is the element a caller has pinned or is measuring. */
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}) => (
  <Box
    ref={ref}
    sx={[{ position: "relative", minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
  >
    {children}
    <Box
      aria-hidden
      sx={{
        ...edgeSx,
        left: 0,
        opacity: edges.start ? 1 : 0,
        background: `linear-gradient(to right, ${ground}, transparent)`,
      }}
    />
    <Box
      aria-hidden
      sx={{
        ...edgeSx,
        right: 0,
        opacity: edges.end ? 1 : 0,
        background: `linear-gradient(to left, ${ground}, transparent)`,
      }}
    />
  </Box>
);

const edgeSx = {
  position: "absolute" as const,
  top: 0,
  bottom: 0,
  width: `${FADE_WIDTH}px`,
  pointerEvents: "none" as const,
  zIndex: FADE_Z,
  transition: "opacity 150ms",
};
