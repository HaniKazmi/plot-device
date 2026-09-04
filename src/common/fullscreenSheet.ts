import type { Theme } from "@mui/material";

/**
 * How far down the screen a sheet header's lower edge falls, safe area included.
 *
 * A sheet's body may pin something of its own — the wall's bucket headings do — and a sticky
 * element inside the same scrollport knows nothing about the one above it: pinned at 0 it parks
 * behind the header and is invisible for as long as its cards are on screen. This is the offset
 * that puts it directly underneath instead, and it is one string rather than a height plus an
 * inset because the header pays for the notch *above* its content: the two only agree by
 * construction if they are the same expression.
 *
 * The figure is the ✕ button's own box — a 24px icon in 8px of padding — plus the rule under it,
 * stated as a floor on the header rather than measured. A bar carrying something taller grows
 * past it and anything pinned under it slides behind again; the titled header `DrilldownDialog`
 * draws is exactly that, and nothing inside that sheet pins itself.
 */
const SHEET_HEADER_HEIGHT = 41;

/** The line a sheet header's content ends on, for a body pinning anything of its own beneath it. */
export const SHEET_HEADER_BOTTOM = `calc(env(safe-area-inset-top) + ${SHEET_HEADER_HEIGHT}px)`;

/**
 * What holds any sheet's top bar at the top of a phone screen, whatever that bar is made of.
 *
 * A fullscreen dialog on a phone is a sheet, and the one way out of a sheet has to stay reachable
 * from a list several screens long — a wall of a thousand cards leaves the reader nothing else to
 * press. The notch is paid for above the bar's content rather than inside it, so the bar's own
 * spacing is what it is at every other width.
 *
 * The rules alone rather than the media query around them, so a caller states its own width: every
 * caller draws a different bar from `sm` up, and one of them changes what it shows as well as
 * where it sits.
 */
export const pinnedSheetTop = (theme: Theme) => ({
  position: "sticky",
  top: 0,
  // Above whatever a dialog's own body pins or fades, which would otherwise paint over the bar
  // as it scrolls under.
  zIndex: theme.zIndex.appBar,
  paddingTop: "env(safe-area-inset-top)",
});

/**
 * The pinned bar as a *header*: the paper's own ground, a rule under it, and the floor
 * `SHEET_HEADER_BOTTOM` states. `CssBaseline` puts every box in `border-box`, so the safe-area
 * padding and the rule are inside that figure.
 *
 * The expanded card's bar is the other kind and is built in `Card.tsx`: it carries its artwork's
 * ground rather than the paper's, meets the picture with no rule, and states a height of its own,
 * which the picture below is then sized against.
 */
export const stickySheetHeader = (theme: Theme) => ({
  ...pinnedSheetTop(theme),
  minHeight: SHEET_HEADER_BOTTOM,
  backgroundColor: theme.vars.palette.background.paper,
  borderBottom: `1px solid ${theme.vars.palette.divider}`,
});
