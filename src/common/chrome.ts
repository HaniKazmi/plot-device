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
