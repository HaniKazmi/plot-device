import type { Theme } from "@mui/material";

/**
 * The app's own furniture, in numbers the page has to make room for.
 *
 * Below `sm` the five tabs sit in a bar fixed to the bottom of the screen (`BottomTabs.tsx`), so
 * the page and anything else pinned down there — the data snackbar — have to stop short of it.
 * Stated here rather than beside the bar, because the bar is not a `common/` shell and the things
 * standing clear of it are: two copies of the number would be two that drift.
 */
export const BOTTOM_TABS_HEIGHT = 56;

/**
 * The bar plus whatever the device reserves under it: 34px on a phone with a home indicator, zero
 * everywhere else. `env()` needs `viewport-fit=cover` in `index.html` to be anything but zero.
 */
export const BOTTOM_TABS_CLEARANCE = `calc(${BOTTOM_TABS_HEIGHT}px + env(safe-area-inset-bottom))`;

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
 * bottom bar and the pinned filter button with the bare `env()` they have no gutter to add to. The
 * sheets need none — the filter sheet and the expanded card's bar are drawn below `sm` alone,
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
