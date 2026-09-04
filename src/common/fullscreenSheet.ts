import type { Theme } from "@mui/material";

/**
 * What pins a fullscreen dialog's header to the top of a phone screen.
 *
 * A fullscreen dialog on a phone is a sheet, and the one way out of a sheet has to stay reachable
 * from a list several screens long — a wall of a thousand cards leaves the reader nothing else to
 * press. The notch is paid for above the header rather than inside it, so the header's own
 * spacing is what it is at every other width.
 *
 * The rules alone rather than the media query around them, so a caller states its own width: both
 * callers draw a different header from `sm` up, and one of them changes what it shows as well as
 * where it sits.
 */
export const stickySheetHeader = (theme: Theme) => ({
  position: "sticky",
  top: 0,
  // Above whatever a dialog's own body pins or fades, which would otherwise paint over the
  // header as it scrolls under.
  zIndex: theme.zIndex.appBar,
  backgroundColor: theme.vars.palette.background.paper,
  paddingTop: "env(safe-area-inset-top)",
  borderBottom: `1px solid ${theme.vars.palette.divider}`,
});
