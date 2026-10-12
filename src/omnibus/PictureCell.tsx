import { Box, type SxProps, type Theme } from "@mui/material";
import type { OmniItem } from "../common/medium";
import { shapeToRatio, type ArtworkShape } from "../common/cardArrangement";
import OmniCardMediaImage from "../app/CardMediaImage";
import { mediumToShape, type Medium } from "../app/types";

/**
 * The picture filling its cell: the card holds no shape of its own here, the cell stating the ratio
 * and the picture covering it, as a single picture's caller does.
 */
const PICTURE_SX = {
  width: "100%",
  height: "100%",
  aspectRatio: "auto",
  objectFit: "cover",
  display: "block",
} as const;

/**
 * The card and its press filling the cell, so the picture's `100%` is the cell's height: a cover
 * otherwise stands at its own ratio inside the press and runs taller than a poster beside it.
 */
const CARD_FILL_SX = { height: "100%", "& .MuiCardActionArea-root": { height: "100%" } } as const;

const EMPTY_SX = { height: "100%", borderRadius: 1, backgroundColor: "action.hover" } as const;

/**
 * One medium's picture held to its cell's ratio, or that cell's empty ground where there is no work
 * to draw, so a tiling of cells keeps its shape and every medium its place.
 *
 * The cell's size is the caller's — a width a grid gives it, or a height a row gives it — and the
 * ratio supplies the other: the medium's own shape, unless the caller states one — a cover held to
 * a poster's ratio so the two stand level side by side. `onOpen` replaces what a press opens, with
 * `openLabel` naming it.
 */
export const PictureCell = (props: {
  medium: Medium;
  shape?: ArtworkShape;
  item: OmniItem | undefined;
  onOpen?: () => void;
  openLabel?: string;
  sx?: SxProps<Theme>;
}) => (
  <Box
    sx={[
      {
        aspectRatio: shapeToRatio(props.shape ?? mediumToShape(props.medium)),
        minWidth: 0,
        overflow: "hidden",
        borderRadius: 1,
      },
      ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
    ]}
  >
    {props.item ? (
      <OmniCardMediaImage
        item={props.item}
        lazy
        cardSx={CARD_FILL_SX}
        sx={PICTURE_SX}
        onOpen={props.onOpen}
        openLabel={props.openLabel}
      />
    ) : (
      <Box sx={EMPTY_SX} />
    )}
  </Box>
);
