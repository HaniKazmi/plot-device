import { Box, SwipeableDrawer, Tooltip, type TooltipProps } from "@mui/material";
import type { Instance as PopperInstance } from "@popperjs/core";
import { cloneElement, useRef, useState, type MouseEventHandler, type ReactElement, type ReactNode } from "react";
import { useCoarsePointer } from "./useCoarsePointer";

/**
 * The gap of the bar's own colour drawn around a hover card.
 *
 * Even on all four sides, and the outer radius set to the card's own plus the gap. A mat of one
 * thickness reads as a frame; a tooltip's default padding is wider at the sides than the top and
 * pinches at every corner, which reads as a mistake.
 *
 * The sheet keeps the same thickness along its top edge alone: the other three sides are the
 * screen, so a mat around them would be a frame around the phone rather than around the card.
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
 *
 * It is a ceiling rather than a size on any screen narrower than it: at 390px a 500px card is
 * pinned to one edge by `preventOverflow` with the rest of it off the other.
 */
const WIDTH = 500;

/** How much of the screen a sheet may take before its own content scrolls inside it. */
const SHEET_MAX_HEIGHT = "85dvh";

/**
 * What a hover card is anchored on: an element the reader can reach, and the fill of the mark it
 * belongs to.
 *
 * The child is cloned with an `onClick` under a coarse pointer, so it must be an element that
 * takes one — every caller passes a `Box`, and none of them carries a click of its own.
 */
interface HoverCardProps {
  /** The bar's fill, which the mat and the arrow are drawn in. */
  colour: string;
  title: ReactNode;
  placement?: TooltipProps["placement"];
  /**
   * Whether the reader is pointing with a finger, where a chart has already asked.
   *
   * The answer is one media query for a whole chart, and a chart is hundreds of marks — the full
   * timeline mounts two of these per bar. Left off, each one subscribes for itself, so a caller
   * drawing many hoists `useCoarsePointer` once and passes it down; a caller mounting one card
   * omits it and is served by the hook.
   */
  coarse?: boolean;
  children: ReactElement<{ onClick?: MouseEventHandler<HTMLElement> }>;
}

/**
 * How every chart in the app mounts an item's hover card.
 *
 * There is no hovering on a phone, so the same card is two surfaces. A pointer gets the popper
 * below; a finger gets a bottom sheet, opened by a tap rather than by MUI's 700ms press, sized to
 * the screen rather than to a stated width, and interactive — the card inside it opens the
 * expanded card, which a `disableInteractive` tooltip cannot be asked to do. The choice is made
 * here so that every chart's marks, beads and bars get it without knowing which surface they are
 * drawn on.
 */
export const HoverCardTooltip = (props: HoverCardProps) =>
  props.coarse === undefined ? (
    <DetectedHoverCard {...props} />
  ) : props.coarse ? (
    <HoverCardSheet {...props} />
  ) : (
    <HoverCardPopper {...props} />
  );

/** The same choice for a caller with nobody above it to have made it, which is most of them. */
const DetectedHoverCard = (props: HoverCardProps) =>
  useCoarsePointer() ? <HoverCardSheet {...props} /> : <HoverCardPopper {...props} />;

/**
 * The hover card as a bottom sheet.
 *
 * The drawer is mounted only while it is on screen. `SwipeableDrawer` attaches touch listeners to
 * the document for the life of every instance it has, open or closed, and a franchise strip is
 * hundreds of marks — one drawer each would be a thousand document listeners for the one card the
 * reader taps. `appear` has to be asked for again with it: `Drawer` skips the slide on a drawer
 * whose first render is already open, which is every drawer mounted this way.
 *
 * `disableSwipeToOpen` is explicit because its default is read off the user agent, and false in
 * Chrome: without it a swipe up from the bottom edge of the screen opens whichever mark's card
 * happens to be mounted, from nowhere the reader pointed at.
 *
 * The drawer sits at the modal layer rather than the drawer layer below it, so a card opened from
 * a bead inside an expanded card is not painted behind the dialog it was opened from. Equal, not
 * higher: two surfaces at one layer stack by portal order, which is the order they were opened in,
 * and the expanded card this sheet opens has to land above the sheet in turn.
 */
const HoverCardSheet = ({ colour, title, children }: HoverCardProps) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const show = () => {
    setMounted(true);
    setOpen(true);
  };

  return (
    <>
      {cloneElement(children, title ? { onClick: show } : {})}
      {mounted && (
        <SwipeableDrawer
          anchor="bottom"
          open={open}
          onOpen={show}
          onClose={() => setOpen(false)}
          disableSwipeToOpen
          slotProps={{
            root: { sx: { zIndex: "modal" } },
            transition: { appear: true, onExited: () => setMounted(false) },
            paper: {
              sx: {
                borderTopStyle: "solid",
                borderTopWidth: `${MAT}px`,
                maxHeight: SHEET_MAX_HEIGHT,
                overflowY: "auto",
                // The home indicator sits over the last few points of the screen, and the card's
                // own figures run to the bottom of the sheet.
                paddingBottom: "env(safe-area-inset-bottom)",
              },
              style: { borderTopColor: colour },
            },
          }}
        >
          {/* A grabber says the sheet is draggable, which is the one thing about a bottom sheet
              that nothing else on it can state. */}
          <Box
            sx={{
              width: 32,
              height: 4,
              borderRadius: 2,
              margin: "8px auto",
              backgroundColor: "text.secondary",
              opacity: 0.4,
            }}
          />
          {/* A phone gives the card the screen; a tablet held sideways would give it the whole
              width, where the card was drawn to be read at one. */}
          <Box sx={{ maxWidth: WIDTH, marginInline: "auto", padding: 1, paddingTop: 0 }}>{title}</Box>
        </SwipeableDrawer>
      )}
    </>
  );
};

/**
 * The hover card as a popper, for a reader who can hover.
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
const HoverCardPopper = ({ colour, title, placement, children }: HoverCardProps) => {
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
            width: `min(${WIDTH}px, calc(100vw - 16px))`,
            maxWidth: `min(${WIDTH}px, calc(100vw - 16px))`,
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
