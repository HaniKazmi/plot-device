import { Box } from "@mui/material";
import { CHIP_HEIGHT, RailChip } from "./ChipRail";
import { bucketLabel } from "./finishedData";
import { MARKER_TOP, type ScrollMarkerState } from "./ScrollMarkerHook";
import { NUMERIC_LABEL_SX } from "./typography";

/**
 * A pill naming the reader's place in the sort, floating beside the wall it describes.
 *
 * It stays mounted and fades, because unmounting it would give the appearance a hard edge on
 * every entry and exit. `pointerEvents: none` because it sits over the cards it names in the
 * narrow layout, and a label is not a target.
 */
export const ScrollMarker = ({ bucket, visible, left, centred }: ScrollMarkerState) => (
  <Box
    aria-hidden
    sx={{
      position: "fixed",
      top: `${MARKER_TOP}px`,
      left: `${left}px`,
      transform: centred ? "translateX(-50%)" : "none",
      // Over the wall, under the rail it hangs from and the dialogs that cover the page.
      zIndex: (theme) => theme.zIndex.appBar - 2,
      pointerEvents: "none",
      opacity: visible && bucket ? 1 : 0,
      transition: "opacity 150ms",
      paddingX: 1,
      paddingY: 0.25,
      borderRadius: 4,
      border: 1,
      borderColor: "divider",
      backgroundColor: "background.paper",
      boxShadow: 2,
      ...NUMERIC_LABEL_SX,
      fontWeight: 650,
      // The pill is what stands in for the rail, so it is the height of a chip in it: the two
      // never appear together, and a label that changed size as the viewport crossed the
      // threshold would read as a different thing rather than the same one relocating.
      lineHeight: `${CHIP_HEIGHT}px`,
    }}
  >
    {bucket}
  </Box>
);

/**
 * The whole sort as a column of chips down the page's gutter: where the reader is, and every
 * other place they could be, in one control.
 *
 * The chips are spread across the viewport's full height rather than packed under the rail,
 * because what they index is the whole page — a stack in the top corner would say the wall ends
 * where the stack does. That spread is also what makes them easy targets: `space-between` gives
 * each one the same share of the span however many there are.
 *
 * The rail replaces the pill rather than joining it — the lit chip says everything the pill did —
 * and it is only ever mounted where the gutter holds it and the span fits every chip at full
 * height, which is what leaves the pill as the answer on a narrow or a short viewport.
 */
export const ScrollMarkerRail = ({ bucket, left, railHeight, buckets, jumpTo }: ScrollMarkerState) => (
  // Its own column of `RailChip`s rather than a `ChipRail`: that shell is a row that scrolls, and
  // everything it does for one — the fades, the edge measuring, the wrapper the caller's `sx` lands
  // on — is for content that runs past its container. This rail is mounted only where the span fits
  // every chip at full height, which is the same test that leaves the pill as the answer otherwise,
  // so there is never anything past its ends.
  <Box
    component="nav"
    aria-label="Jump to a position in the library"
    sx={{
      display: "flex",
      position: "fixed",
      top: `${MARKER_TOP}px`,
      left: `${left}px`,
      transform: "translateX(-50%)",
      height: `${railHeight}px`,
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 0.5,
      // Over the wall, under the rail it hangs from and the dialogs that cover the page.
      zIndex: (theme) => theme.zIndex.appBar - 2,
    }}
  >
    {buckets.map((entry) => (
      <RailChip
        key={entry}
        label={bucketLabel(entry)}
        active={entry === bucket}
        onClick={() => jumpTo(entry)}
      />
    ))}
  </Box>
);
