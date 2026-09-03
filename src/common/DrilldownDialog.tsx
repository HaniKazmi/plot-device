import { CloseFullscreen } from "@mui/icons-material";
import { CardHeader, Dialog, IconButton } from "@mui/material";
import { EXPANDED_CARDS, StatsListGrid, type CardLayout } from "./Stats";
import type { CardMediaImageProps, MediaBand, TypedCardMediaImage } from "./Card";
import type { ArtworkShape } from "./cardArrangement";

/**
 * The fullscreen list a grouped card drills into: a header naming the group, and the group's
 * items as a capped card grid.
 *
 * Mounting is the caller's: render it when a group is picked and `null` otherwise, so the grid
 * is never built behind a closed dialog. The close button is the only way out — the dialog is
 * fullscreen with no `onClose` — which is why the header always carries it.
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
  >
    <CardHeader
      title={props.title}
      action={
        <IconButton onClick={props.onClose}>
          <CloseFullscreen color="primary" />
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
