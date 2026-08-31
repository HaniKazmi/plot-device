import { Tooltip, type TooltipProps } from "@mui/material";
import type { ReactElement, ReactNode } from "react";

/**
 * The gap of the bar's own colour drawn around a hover card.
 *
 * Even on all four sides, and the outer radius set to the card's own plus the gap. A mat of one
 * thickness reads as a frame; a tooltip's default padding is wider at the sides than the top and
 * pinches at every corner, which reads as a mistake.
 */
const MAT = 4;

/**
 * The width a hover card opens at, whatever chart it was opened from.
 *
 * Stated rather than left to the content, because the content is a card whose own width is its
 * artwork's: a banner would open at one width and a poster at another from the same row. Held here
 * rather than at each chart for the same reason one shell draws the bars — a tooltip's default
 * ceiling is 300px, so a chart that forgets this opens a card two thirds the size of its neighbour's
 * and nothing about the card itself says why.
 */
const WIDTH = 500;

/**
 * How tall a poster stands beside the words, which is what its width then follows from.
 *
 * Pinned on the height rather than the width, for the reason the hero pins the same axis: a picture
 * asked how wide it wants to be answers with its file's own pixels, and a hover card has no outside
 * width to shrink that against the way a card in a grid does. A height plus the declared ratio gives
 * the card the same size before its image has loaded as after, which is what the popper needs — it
 * positions the card once, at the moment it opens.
 */
export const HOVER_CARD_ASIDE_ARTWORK_HEIGHT = 348;

/**
 * How every chart in the app mounts an item's hover card.
 *
 * The mat is what ties the card to the bar it came from: the card is drawn on the bar's colour and
 * the arrow points back at it, so a card opened over a dense chart still says which mark it belongs
 * to. The shadow sits outside the mat rather than on the card, because the card's own elevation is
 * covered by the mat — and a hover card that casts nothing reads as part of the grid.
 *
 * A card opening below a bar in the lower half of the screen runs off the bottom of the viewport,
 * and these charts scroll sideways rather than down, so there is nothing to scroll to reach the rest
 * of it. Flipping above the bar is the whole fix — a height cap would truncate the card instead, and
 * the card is the content. `altAxis` keeps the same card inside the left and right edges at either
 * end of a chart four viewports wide, where a bar can sit hard against the container.
 */
export const HoverCardTooltip = ({
  colour,
  title,
  placement,
  children,
}: {
  /** The bar's fill, which the mat and the arrow are drawn in. */
  colour: string;
  title: ReactNode;
  placement?: TooltipProps["placement"];
  children: ReactElement;
}) => (
  <Tooltip
    arrow
    disableInteractive
    title={title}
    placement={placement}
    slotProps={{
      tooltip: {
        sx: (theme) => ({
          backgroundColor: colour,
          padding: `${MAT}px`,
          borderRadius: `${Number(theme.shape.borderRadius) + MAT}px`,
          boxShadow: theme.shadows[8],
          width: `${WIDTH}px`,
          maxWidth: `${WIDTH}px`,
        }),
      },
      // The arrow takes the tooltip's default ground rather than the one set above, so the colour
      // has to be given to it again.
      arrow: { sx: { color: colour } },
      popper: {
        modifiers: [
          { name: "flip", options: { fallbackPlacements: ["top", "bottom"] } },
          { name: "preventOverflow", options: { altAxis: true, padding: 8 } },
        ],
      },
    }}
  >
    {children}
  </Tooltip>
);
