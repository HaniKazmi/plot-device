import { Dialog } from "@mui/material";
import type { ReactNode } from "react";
import { SheetBar } from "./SheetBar";
import { EXPANDED_CARDS, StatsListGrid, type CardLayout } from "./Stats";
import type { CardMediaImageProps, MediaBand, TypedCardMediaImage } from "./Card";
import type { ArtworkShape } from "./cardArrangement";

/**
 * The fullscreen list a grouped card drills into: a bar naming the group, and the group's items as
 * a capped card grid.
 *
 * Mounting is the caller's: render it when a group is picked and `null` otherwise, so the grid
 * is never built behind a closed dialog. The name and the way out are the `SheetBar` every layer
 * in the app opens with, pinned at every width — a fullscreen dialog covers the handle that opened
 * it, and a drill-down runs five hundred cards deep, so the ✕ has to stay on screen from any
 * scroll position. Nothing below the bar states the group, so the bar is where it is named.
 */
export const DrilldownDialog = <T,>(
  props: {
    title: ReactNode;
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
    /**
     * Something to say about the group before listing it, between the bar and the grid — the
     * franchise view's facts and strip. Nothing, for a drill-down whose title says it all.
     */
    header?: ReactNode;
  } & CardLayout,
) => (
  <Dialog
    open
    fullScreen
    // Escape and a press outside leave the list, as every other dialog in the app answers to.
    onClose={props.onClose}
  >
    <SheetBar
      title={props.title}
      onClose={props.onClose}
    />
    {props.header}
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
