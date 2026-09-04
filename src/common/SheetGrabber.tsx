import { Box } from "@mui/material";

/**
 * The bar at the top of a bottom sheet, which is the one thing about a sheet nothing else on it can
 * say: that it can be dragged away.
 *
 * One size and one radius wherever it appears — the hover card's sheet, the filter sheet and the
 * expanded card's own bar — because the three are the same gesture and a reader meets them on the
 * same screen. `colour` is for a bar standing on a sampled ground, where the theme's divider is a
 * tone that ground does not have; without one it takes the divider.
 *
 * It centres itself with `alignSelf` rather than an automatic margin, so it lands in the middle of
 * a sheet's own column and stays where it is put in the card bar's row.
 */
export const SheetGrabber = (props: { colour?: string }) => (
  <Box
    sx={{
      flexShrink: 0,
      alignSelf: "center",
      width: 32,
      height: 4,
      borderRadius: 2,
      backgroundColor: props.colour ?? "divider",
    }}
  />
);
