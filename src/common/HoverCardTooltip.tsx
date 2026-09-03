import { Tooltip, type TooltipProps } from "@mui/material";
import type { Instance as PopperInstance } from "@popperjs/core";
import { useRef, type ReactElement, type ReactNode } from "react";

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
 *
 * The popper places the card once, at the moment it opens, and a card that grows after that — a
 * hover card whose chunk is still arriving, a picture landing in a card that had not reserved for
 * it — grows from an anchor placed for something smaller, over the mark it belongs to and off the
 * top of the screen for a mark near it. The content is observed for the life of the tooltip and the
 * popper asked to place it again on every change of size, so the flip and the overflow rules are
 * applied to the card as it is rather than as it opened.
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
}) => {
  const popper = useRef<PopperInstance | null>(null);
  // A callback ref rather than an effect: the content exists only while the tooltip is open, and
  // this runs when it mounts and cleans up when it goes.
  const observe = (node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() => void popper.current?.update());
    observer.observe(node);
    return () => observer.disconnect();
  };

  return (
    <Tooltip
      arrow
      disableInteractive
      title={<div ref={observe}>{title}</div>}
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
          popperRef: popper,
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
};
