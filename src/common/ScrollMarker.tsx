import { Box } from "@mui/material";
import { MARKER_TOP, type ScrollMarkerState } from "./ScrollMarkerHook";

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
      fontSize: 12,
      fontWeight: 650,
      lineHeight: "22px",
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {bucket}
  </Box>
);
