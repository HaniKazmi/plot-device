import { Close, CloseFullscreen } from "@mui/icons-material";
import { CardHeader, Dialog, IconButton, type Theme } from "@mui/material";
import { stickySheetHeader } from "./fullscreenSheet";
import { EXPANDED_CARDS, StatsListGrid, type CardLayout } from "./Stats";
import type { CardMediaImageProps, MediaBand, TypedCardMediaImage } from "./Card";
import type { ArtworkShape } from "./cardArrangement";

const CLOSE_ICON_SX = { display: { xs: "block", sm: "none" } } as const;
const COLLAPSE_ICON_SX = { display: { xs: "none", sm: "block" } } as const;

/**
 * The header, pinned on a phone. Built here rather than in the component: a width is a key
 * computed from the theme, and an object literal with a computed key is a shape the React Compiler
 * cannot lower, so written inline it would take the dialog out of memoization silently.
 */
const HEADER_SX = (theme: Theme) => ({ [theme.breakpoints.down("sm")]: stickySheetHeader(theme) });

/**
 * The fullscreen list a grouped card drills into: a header naming the group, and the group's
 * items as a capped card grid.
 *
 * Mounting is the caller's: render it when a group is picked and `null` otherwise, so the grid
 * is never built behind a closed dialog. The header always carries a way out, since a fullscreen
 * dialog covers the handle that opened it; below `sm` that header sticks to the top of the screen,
 * a drill-down running five hundred cards deep.
 */
export const DrilldownDialog = <T,>(
  props: {
    title: string;
    onClose: () => void;
    content: T[];
    cardKey: (t: T) => string;
    labelComponent: (t: T) => string[][];
    chipComponent?: (t: T) => CardMediaImageProps["chip"];
    shape?: ArtworkShape;
    /** See `StatsListGrid`: a band along the top of each card. */
    band?: MediaBand<T>;
    divider?: boolean;
    MediaComponent: TypedCardMediaImage<T>;
  } & CardLayout,
) => (
  <Dialog
    open
    fullScreen
    // Escape and a press outside leave the list, as every other dialog in the app answers to.
    onClose={props.onClose}
  >
    <CardHeader
      sx={HEADER_SX}
      title={props.title}
      action={
        <IconButton
          aria-label="Close"
          onClick={props.onClose}
        >
          {/* Two icons rather than a width read in JS: the ✕ is the phone's word for leaving a
              sheet, where the arrows say "back to the card this came out of". */}
          <Close
            color="primary"
            sx={CLOSE_ICON_SX}
          />
          <CloseFullscreen
            color="primary"
            sx={COLLAPSE_ICON_SX}
          />
        </IconButton>
      }
      slotProps={{ title: { variant: "h6" } }}
    />
    <StatsListGrid
      content={props.content}
      cardKey={props.cardKey}
      labelComponent={props.labelComponent}
      chipComponent={props.chipComponent}
      shape={props.shape}
      band={props.band}
      divider={props.divider}
      MediaComponent={props.MediaComponent}
      // Whichever arm the layout is in, spread alone: naming both props would hand the grid a pair
      // of `undefined`s that satisfy neither.
      {...(props.rowSizing
        ? { rowSizing: props.rowSizing, limit: EXPANDED_CARDS }
        : { pictureWidth: props.pictureWidth, limit: EXPANDED_CARDS })}
    />
  </Dialog>
);
