import type { Theme } from "@mui/material";

/**
 * The app's own furniture, in numbers the page has to make room for.
 *
 * Below `sm` one bar is fixed to the bottom of the screen (`BottomTabs.tsx`): the page's own rail
 * along the bottom edge at every scroll position, and the five tabs above it whenever the reader is
 * at the top of the page or scrolling up. The page and anything else pinned down there, the data
 * snackbar, stop short of the bar at its full height, so nothing below the fold moves as the tab row
 * folds and returns. Stated here rather than beside the bar, because the bar is not a `common/`
 * shell and the things standing clear of it are: two copies of the number would be two that drift.
 */
export const BOTTOM_TABS_HEIGHT = 56;

/**
 * The rail's row in that bar. Four under a header's control (`RAIL_CHIP_HEIGHT` is 24, or 32 under
 * a finger), which is the least a row of coarse chips sits in with its own breathing room, on the
 * screen where every pixel of chrome is taken from the page.
 */
export const PHONE_RAIL_HEIGHT = 40;

/**
 * The bar at its full height — both rows — plus whatever the device reserves under it: 34px on a
 * phone with a home indicator, zero everywhere else. `env()` needs `viewport-fit=cover` in
 * `index.html` to be anything but zero.
 */
export const BOTTOM_TABS_CLEARANCE = `calc(${BOTTOM_TABS_HEIGHT + PHONE_RAIL_HEIGHT}px + env(safe-area-inset-bottom))`;

/**
 * The page's own side gutters with whatever the device reserves beside them.
 *
 * `viewport-fit=cover` lays the page out to the physical edges of the screen, which is what the
 * bottom bar wants and what every horizontal edge then has to pay for: held sideways, a notched
 * phone puts the sensor housing over one side and a rounded corner over the other, so the wordmark,
 * the ⋮ and the first card of every row sit under them. A padding cannot be added to, so the
 * numbers here are MUI's own gutters for `Container` and `Toolbar` — the same table for both, 16px
 * and 24px from `sm` — restated with the inset on top.
 *
 * Only the surfaces that reach those edges take it: the app bar and the page container here, the
 * bottom bar with the bare `env()` it has no gutter to add to. The sheets need none — the box and
 * the expanded card's bar are drawn below `sm` alone,
 * which is portrait, where the two horizontal insets are zero, and the hover card's sheet holds its
 * content to 500px in the middle of whatever width it is given.
 */
export const safeAreaGutters = (theme: Theme) => ({
  paddingLeft: {
    xs: `calc(${theme.spacing(2)} + env(safe-area-inset-left))`,
    sm: `calc(${theme.spacing(3)} + env(safe-area-inset-left))`,
  },
  paddingRight: {
    xs: `calc(${theme.spacing(2)} + env(safe-area-inset-right))`,
    sm: `calc(${theme.spacing(3)} + env(safe-area-inset-right))`,
  },
});

/**
 * A scroll the page starts for itself — a rail chip taking the reader to a section — as distinct
 * from one the reader makes.
 *
 * The bottom bar folds its tab row on a scroll down and returns it on a scroll up, reading the
 * reader's intent off the direction; a smooth scroll to a section above answers that reading with
 * the tabs up, when the reader asked only for a section. The rail says so before it scrolls, and the
 * bar's listener treats every event until the scroll settles — no event for `SETTLE_MS` — as the
 * page's own. Settling by silence rather than `scrollend`, which iOS Safari delivers only from 26,
 * and a smooth scroll to a section already in view delivers no event at all: the mark lapses on
 * its own either way.
 *
 * Module state rather than a store: nothing renders on it, and the one reader asks at the moment of
 * each scroll event.
 */
const SETTLE_MS = 160;
let ownScroll = false;
let settle: ReturnType<typeof setTimeout> | undefined;

const armSettle = () => {
  clearTimeout(settle);
  settle = setTimeout(() => {
    ownScroll = false;
  }, SETTLE_MS);
};

export const beginOwnScroll = () => {
  ownScroll = true;
  armSettle();
};

/** Whether the scroll event just delivered belongs to a scroll the page started, extending the mark if so. */
export const isOwnScroll = () => {
  if (ownScroll) armSettle();
  return ownScroll;
};
