import { Box, IconButton, Typography, type SxProps, type Theme } from "@mui/material";
import { Close } from "@mui/icons-material";
import type { ReactNode } from "react";
import { paperSheetBar } from "./fullscreenSheet";
import { SheetGrabber } from "./SheetGrabber";

/**
 * What every layer in the app wears as its first child: a title and a ✕, on a 48px row, sticky at
 * the top of whatever it heads.
 *
 * One bar for the expanded card, the expanded list, the drill-down, the hover sheet and search,
 * because the reader's question at each of them is the same one — what is this, and how do I leave
 * — and a chrome per layer teaches an answer per layer. The ✕ stands at the right of the bar at
 * every width: an arrows-in glyph in a dialog's header says "back to the card this came out of",
 * which is a second verb for the one thing a layer does.
 *
 * The title is stated at every scroll position rather than faded in past the content: on the
 * expanded card it is the one fact a full-bleed picture does not carry, and a bar whose middle
 * fills in as you scroll moves the ✕ nowhere but reads as something loading. It is a node rather
 * than a string for the franchise view, whose name arrives with the swatch and the count the name
 * means little without.
 *
 * A caller wanting a ground of its own passes the whole `sx` rather than a colour: the expanded
 * card's bar takes its artwork's ground *and* is drawn below `sm` alone, and a bottom sheet's
 * stands under no notch, so what varies is the whole rule and not one property of it. Where the bar
 * is pinned, the surface holding it has to open its clipping — an ancestor whose `overflow` is
 * anything but `visible` becomes the scrollport a sticky element measures against, and a box that
 * never scrolls parks the bar at the top of a card several screens tall.
 *
 * It lives beside the sheet recipes rather than in the card layer so the hover card can wear it:
 * `HoverCardTooltip` wears it on its bottom sheet and the timeline band (`TimelineBand.tsx`) mounts
 * its card through that tooltip, so a bar exported from the card layer would close that import
 * into a cycle.
 */
export const SheetBar = (props: {
  title: ReactNode;
  onClose: () => void;
  /**
   * Whether the bar says it can be dragged away, which only a swipeable sheet can: a fullscreen
   * dialog wearing a grabber offers a gesture that does nothing.
   */
  grabber?: boolean;
  /** The grabber's own colour, for a bar on a sampled ground where the divider is a tone it lacks. */
  grabberColour?: string;
  /** Where the bar stands and what it stands on, where that is not the paper at every width. */
  sx?: SxProps<Theme>;
  /**
   * Whether the title is clipped at the ✕ rather than given the room it asks for. A name is, since
   * a long one would otherwise push the way out off the row; a title that is itself a control is
   * not, `noWrap`'s own `overflow: hidden` cutting the focus ring off whatever inside it takes the
   * keyboard.
   */
  titleNoWrap?: boolean;
}) => (
  <Box sx={props.sx ?? paperSheetBar}>
    {props.grabber && <SheetGrabber colour={props.grabberColour} />}
    <Typography
      variant="subtitle2"
      component="div"
      noWrap={props.titleNoWrap ?? true}
      sx={{ flexGrow: 1, minWidth: 0 }}
    >
      {props.title}
    </Typography>
    <IconButton
      aria-label="Close"
      onClick={props.onClose}
      sx={{ color: "inherit" }}
    >
      <Close />
    </IconButton>
  </Box>
);
