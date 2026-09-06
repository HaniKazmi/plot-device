import type { Theme } from "@mui/material";

/**
 * The height of a sheet bar, which is the first child of every layer the app opens.
 *
 * One figure across the expanded card, the expanded list, the drill-down, the hover sheet and
 * search, because a reader meets several of them on one screen and a bar changing height between
 * them reads as a different piece of chrome each time. It is a height rather than a floor wherever
 * a picture is sized against the room the bar leaves — the expanded card's artwork subtracts
 * exactly this — so a bar given something taller than one line of `subtitle2` beside a 32px button
 * breaks that arithmetic rather than growing to fit.
 */
export const SHEET_BAR_HEIGHT = 48;

/**
 * The line a sheet bar's content ends on, for a body pinning anything of its own beneath it.
 *
 * A sheet's body may pin something — the wall's bucket headings do — and a sticky element inside
 * the same scrollport knows nothing about the one above it: pinned at 0 it parks behind the bar and
 * is invisible for as long as its cards are on screen. This is the offset that puts it directly
 * underneath instead, and it is one string rather than a height plus an inset because the bar pays
 * for the notch *above* its content: the two only agree by construction if they are the same
 * expression.
 */
export const SHEET_HEADER_BOTTOM = `calc(env(safe-area-inset-top) + ${SHEET_BAR_HEIGHT}px)`;

/**
 * The row a sheet bar's grabber, title and ✕ stand in, wherever that bar is drawn.
 *
 * Ground and position are the caller's: a bar at the top of a fullscreen surface is pinned there
 * and pays for the notch (`pinnedSheetBar`), a bottom sheet's stands under no notch at all, and the
 * expanded card's takes its artwork's ground where every other takes the paper's. What is the same
 * everywhere is the height and the spacing the three parts sit in.
 */
export const sheetBarRow = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  paddingInline: 1,
  minHeight: SHEET_BAR_HEIGHT,
  flexShrink: 0,
} as const;

/**
 * What holds any sheet's top bar at the top of a phone screen, whatever that bar is made of.
 *
 * A fullscreen dialog on a phone is a sheet, and the one way out of a sheet has to stay reachable
 * from a list several screens long — a wall of a thousand cards leaves the reader nothing else to
 * press. The notch is paid for above the bar's content rather than inside it, so the bar's own
 * spacing is what it is at every other width.
 *
 * The rules alone rather than the media query around them, so a caller states its own width: the
 * expanded card draws its bar below `sm` alone, where every other layer draws one at every width.
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
 * The sheet bar's row, held at the top of a fullscreen surface with the notch above it. The ground
 * is the caller's — the paper's for a layer over the page, the artwork's for an expanded card.
 */
export const pinnedSheetBar = (theme: Theme) => ({
  ...sheetBarRow,
  ...pinnedSheetTop(theme),
  minHeight: SHEET_HEADER_BOTTOM,
});

/**
 * The pinned bar as a *header*: the paper's own ground, a rule under it, and the floor
 * `SHEET_HEADER_BOTTOM` states. `CssBaseline` puts every box in `border-box`, so the safe-area
 * padding and the rule are inside that figure.
 *
 * A caller whose header is not a sheet bar — search, whose input row is the bar — takes this
 * without `sheetBarRow` and states its own spacing.
 */
export const stickySheetHeader = (theme: Theme) => ({
  ...pinnedSheetTop(theme),
  minHeight: SHEET_HEADER_BOTTOM,
  backgroundColor: theme.vars.palette.background.paper,
  borderBottom: `1px solid ${theme.vars.palette.divider}`,
});
