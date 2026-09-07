import { Box, SwipeableDrawer, Tooltip, type TooltipProps } from "@mui/material";
import type { Instance as PopperInstance } from "@popperjs/core";
import {
  cloneElement,
  useRef,
  useState,
  type MouseEvent,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from "react";
import { useCoarsePointer } from "./useCoarsePointer";
import { SheetGrabber } from "./SheetGrabber";
import { SheetBar } from "./SheetBar";
import { HoverCardHoldContext } from "./hoverCardHold";
import { sheetBarRow } from "./fullscreenSheet";

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

/** That width as a ceiling: the card, or the screen less a margin either side, whichever is smaller. */
const CARD_WIDTH = `min(${WIDTH}px, calc(100vw - 16px))`;

/**
 * How long the pointer rests on a mark before its card opens, and how long the card outlives the
 * pointer leaving it.
 *
 * The delay on the way in is what keeps a sweep across a packed row from opening a card per bar;
 * the one on the way out is the crossing itself — the card sits a mat's width from its anchor, and
 * a tooltip that closed on the leave event would be gone before the pointer arrived. Twelve pixels
 * of mat and arrow is what has to be crossed, so the way out is short: their *difference* is how
 * long two cards can stand at once, which a row mounting one of these on its bar and another on
 * the label beside it makes reachable. Thirty milliseconds of that is a couple of frames; a
 * hundred is a visible pair of the same card. A `transparent` card holds the way out at nothing
 * instead: nothing can cross to it, and a pointer running through it would otherwise trail a card
 * per mark it passed.
 */
const ENTER_DELAY = 120;
const LEAVE_DELAY = 150;

/** How much of the screen a sheet may take before its own content scrolls inside it. */
const SHEET_MAX_HEIGHT = "85dvh";

/**
 * What a hover card is anchored on: an element the reader can reach, and the fill of the mark it
 * belongs to.
 *
 * The child is cloned with an `onClick` — by the sheet under a coarse pointer, and by a
 * `transparent` popper under a fine one — so it must be an element that takes one: every caller
 * passes a `Box`. A child carrying a click of its own keeps it on a fine pointer, composed with the
 * card's own, and loses it to the sheet on a coarse one, which is the right way round: the
 * timeline's marks open their item on a click, and a tap there should open the sheet the finger
 * came for.
 */
interface HoverCardProps {
  /** The bar's fill, which the mat and the arrow are drawn in. */
  colour: string;
  title: ReactNode;
  /**
   * What the card is about, for the sheet's own bar — every layer names itself and carries a ✕.
   * A caller whose marks hold nothing but a tooltip node leaves it off and the sheet is the
   * grabber alone: a bar stating nothing spends 48px of the screen saying so.
   */
  name?: string;
  placement?: TooltipProps["placement"];
  /**
   * Whether the card should ignore the pointer.
   *
   * A packed timeline stacks its marks a row apart and the card is 500px wide, so a card opened
   * over one row covers the several below it: a reader running down the chart hits the card
   * instead of the next mark, and the card is about the row they have already left. Ignoring the
   * pointer lets the scan carry on through it — at the cost of the crossing, so a caller asking
   * for this owes the reader another way in to the item, which the timeline gives its marks.
   */
  transparent?: boolean;
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
 * below; a finger gets a bottom sheet, opened by a tap rather than by MUI's 700ms press and sized
 * to the screen rather than to a stated width. Both are interactive, so the card inside either
 * opens the item's expanded card: a hovered mark is a door to the same place a tapped one is. The
 * choice is made here so that every chart's marks, beads and bars get it without knowing which
 * surface they are drawn on.
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
const HoverCardSheet = ({ colour, title, name, children }: HoverCardProps) => {
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
                // The room above a grabber standing on its own, which the bar pays for itself.
                paddingTop: name ? 0 : 1,
                // The home indicator sits over the last few points of the screen, and the card's
                // own figures run to the bottom of the sheet.
                paddingBottom: "env(safe-area-inset-bottom)",
              },
              style: { borderTopColor: colour },
            },
          }}
        >
          {/* The bar every layer wears, where the mark knows what it is about. It takes the row
              alone rather than the pinned recipe: a sheet anchored to the bottom edge stands under
              no notch, and the drawer's own paper is the ground beneath it. */}
          {name ? (
            <SheetBar
              title={name}
              grabber
              onClose={() => setOpen(false)}
              sx={sheetBarRow}
            />
          ) : (
            <SheetGrabber />
          )}
          {/* A phone gives the card the screen; a tablet held sideways would give it the whole
              width, where the card was drawn to be read at one. */}
          <Box sx={{ maxWidth: WIDTH, marginInline: "auto", padding: 1 }}>{title}</Box>
        </SwipeableDrawer>
      )}
    </>
  );
};

/**
 * The popper's own style, as one of three shared objects rather than a fresh literal.
 *
 * `styleFunctionSx` returns early on a missing `sx` and does the whole breakpoint walk on an empty
 * object, so a literal built per render costs every closed tooltip in the app that walk — the
 * strips and their hundreds of beads included, none of which asks for either rule. Hoisted, each
 * distinct pair is also one emotion class rather than one per tooltip.
 */
const HIDDEN_SX = { visibility: "hidden" } as const;
const TRANSPARENT_SX = { pointerEvents: "none" } as const;
const HIDDEN_TRANSPARENT_SX = { ...HIDDEN_SX, ...TRANSPARENT_SX } as const;

const popperSx = (hidden: boolean, transparent: boolean) =>
  hidden ? (transparent ? HIDDEN_TRANSPARENT_SX : HIDDEN_SX) : transparent ? TRANSPARENT_SX : undefined;

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
 *
 * It is interactive unless the caller asks for `transparent`, so the pointer can cross the mat and
 * reach the card: the picture inside opens the item's expanded card, which is the door a finger
 * already has through the sheet and the one a mouse would otherwise be offered less of. A
 * transparent card gives that door back through its mark instead, since the crossing is what it
 * trades away. `leaveDelay` is what makes that crossing possible — a
 * tooltip closing on the anchor's own leave event closes before the pointer arrives — and the open
 * flag is held here rather than left to MUI so a card that has opened a dialog of its own can keep
 * the popper mounted under it (`HoverCardHold`).
 */
const HoverCardPopper = ({ colour, title, placement, transparent, children }: HoverCardProps) => {
  const popper = useRef<PopperInstance | null>(null);
  const [hovered, setHovered] = useState(false);
  /**
   * When the press that opened a layer last put this card away.
   *
   * A moment rather than a flag, because both the thing it has to stop and the thing it must not
   * stop arrive the same way. MUI arms its enter timer on the pointer reaching the mark and clears
   * it only on the pointer leaving, never on a click, so a press inside `ENTER_DELAY` is followed
   * by that timer opening the card anyway — over the layer the press just opened, and with no leave
   * to come while a modal holds the pointer. A flag held until the next leave would stop it, and
   * would still be held when the reader comes back to the mark afterwards, because that leave never
   * arrives either: the mark would never open its card again. The timer can only fire within
   * `ENTER_DELAY` of the press that armed it, so the moment tells the two apart.
   */
  const pressedAt = useRef(0);
  // A count rather than a flag: layers nest — a drill-down opened from a card holds the popper,
  // and every card inside that drill-down holds it again while its own dialog is up. Released as a
  // flag, the innermost card's close would clear the outermost hold and unmount the whole stack.
  const [held, setHeld] = useState(0);
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
      open={hovered || held > 0}
      onOpen={() => {
        if (Date.now() - pressedAt.current > ENTER_DELAY) setHovered(true);
      }}
      onClose={() => setHovered(false)}
      // Long enough that a pointer crossing a dense chart does not open a card per mark it passes,
      // and long enough on the way out to reach the card across the mat.
      //
      // A card that ignores the pointer cannot be reached, so it holds the way out at nothing: the
      // delay would only keep the last card up while the next one opens, and a chart packs its
      // marks close enough that a scan then trails several cards at once.
      enterDelay={ENTER_DELAY}
      // Stated as well as `enterDelay`, because MUI holds a hysteresis flag shared by every tooltip
      // in the app and reads this one instead for 800ms after any of them closes — and its own
      // default is no delay at all. Left out, a pointer run down a chart opens a card per mark it
      // crosses, each of them fetching artwork and reading a colour off it.
      enterNextDelay={ENTER_DELAY}
      leaveDelay={transparent ? 0 : LEAVE_DELAY}
      title={
        <HoverCardHoldContext.Provider
          value={{ hold: () => setHeld((n) => n + 1), release: () => setHeld((n) => Math.max(0, n - 1)) }}
        >
          <div ref={observe}>{title}</div>
        </HoverCardHoldContext.Provider>
      }
      placement={placement}
      slotProps={{
        tooltip: {
          sx: (theme) => ({
            backgroundColor: colour,
            padding: `${MAT}px`,
            borderRadius: `${Number(theme.shape.borderRadius) + MAT}px`,
            boxShadow: theme.shadows[8],
            width: CARD_WIDTH,
            maxWidth: CARD_WIDTH,
          }),
        },
        // The arrow takes the tooltip's default ground rather than the one set above, so the colour
        // has to be given to it again.
        arrow: { sx: { color: colour } },
        popper: {
          popperRef: popper,
          // Held open but not hovered means a layer the card opened is standing over it, and the
          // popper sits at the tooltip level, above every modal — so it would paint across the
          // dialog it just opened, which on a fullscreen one covers the list the reader pressed
          // for. It stays mounted, because that is what the hold is for; it just stops being seen.
          sx: popperSx(held > 0 && !hovered, transparent ?? false),
          modifiers: [
            { name: "flip", options: { fallbackPlacements: ["top", "bottom"] } },
            { name: "preventOverflow", options: { altAxis: true, padding: 8 } },
          ],
        },
      }}
    >
      {transparent
        ? // A card that ignores the pointer has handed the press to its mark, so that press is also
          // the card's way out. A layer opened from the mark covers the chart and swallows the
          // pointer, so the mark never gets the leave event that would close it — left standing, the
          // card floats over the layer and is still there when the layer is dismissed, with the
          // pointer long since somewhere else. Only the pressed mark's own card can be open at that
          // moment, so it is the only one that has to be told.
          cloneElement(children, {
            onClick: (event: MouseEvent<HTMLElement>) => {
              pressedAt.current = Date.now();
              setHovered(false);
              children.props.onClick?.(event);
            },
          })
        : children}
    </Tooltip>
  );
};
