import { CloseFullscreen } from "@mui/icons-material";
import { CardHeader, Dialog, IconButton } from "@mui/material";
import { EXPANDED_CARDS, StatsListGrid } from "./Stats";
import type { CardMediaImageProps, TypedCardMediaImage } from "./Card";

/**
 * The fullscreen list a grouped card drills into: a header naming the group, and the group's
 * items as a capped card grid.
 *
 * Mounting is the caller's: render it when a group is picked and `null` otherwise, so the grid
 * is never built behind a closed dialog. The close button is the only way out — the dialog is
 * fullscreen with no `onClose` — which is why the header always carries it.
 */
export const DrilldownDialog = <T,>({
  title,
  onClose,
  content,
  cardKey,
  labelComponent,
  chipComponent,
  pictureWidth,
  divider,
  MediaComponent,
}: {
  title: string;
  onClose: () => void;
  content: T[];
  cardKey: (t: T) => string;
  labelComponent: (t: T) => string[][];
  chipComponent?: (t: T) => CardMediaImageProps["chip"];
  pictureWidth: [number, number, number];
  divider?: boolean;
  MediaComponent: TypedCardMediaImage<T>;
}) => (
  <Dialog
    open
    fullScreen
  >
    <CardHeader
      title={title}
      action={
        <IconButton onClick={onClose}>
          <CloseFullscreen color="primary" />
        </IconButton>
      }
      slotProps={{ title: { variant: "h6" } }}
    />
    <StatsListGrid
      content={content}
      limit={EXPANDED_CARDS}
      cardKey={cardKey}
      labelComponent={labelComponent}
      chipComponent={chipComponent}
      pictureWidth={pictureWidth}
      divider={divider}
      MediaComponent={MediaComponent}
    />
  </Dialog>
);
