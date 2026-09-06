import type { Theme } from "@mui/material";
import { createStore } from "./store";

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
 * The app bar's own height, which is how far the page scrolls before the tint strip and the
 * `theme-color` metas give up the bar's colour: the bar is `position: static`, so this is exactly
 * the offset at which it leaves the screen.
 *
 * MUI's own `Toolbar` minimum at `xs`, which is 48 in the landscape query alone — a phone turned
 * sideways swaps 8px later than it could, and nothing reads differently in that gap.
 */
const APP_BAR_HEIGHT = 56;

/**
 * How far past the bar the page has to be before the answer changes, and how far back before it
 * changes again.
 *
 * Two surfaces swap on this one boundary — the tint strip at the top edge and the two
 * `theme-color` metas — so a reader who comes to rest with the page a pixel either side of the
 * app bar's own height would otherwise have both flicker on
 * every small movement of the thumb, momentum scrolling and a rubber band at the top both crossing
 * a bare threshold repeatedly. A band around it makes each crossing a deliberate one: the page has
 * to travel 16px to change the answer back.
 */
const BAR_DEAD_BAND = 8;

/**
 * Whether the page is past the app bar, given where it is and the answer currently held: the
 * threshold is asymmetric, so the state it is in decides which edge of the band it is tested
 * against.
 */
export const scrolledPastBar = (scrollY: number, past: boolean): boolean =>
  past ? scrollY > APP_BAR_HEIGHT - BAR_DEAD_BAND : scrollY > APP_BAR_HEIGHT + BAR_DEAD_BAND;

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
 * The strip Safari samples to colour a phone's status bar (`BrowserTint.tsx`), as the two numbers
 * the page has to know about it.
 *
 * Safari sees nothing it cannot see: an element anything paints over is never sampled, so the strip
 * stands in front of whatever is at the top of the page rather than behind it. It has to be
 * `BROWSER_TINT_HEIGHT` tall — a 3px strip is not sampled, the floor being nearer 12 — but only
 * `BROWSER_TINT_VISIBLE` of it need be on screen, so it hangs above the edge and shows the least it
 * can. That sliver is what the surface beneath has to make room for, the section rail being the one
 * that reaches the top edge from `sm` up. Below that width nothing is pinned there and the strip
 * stands over the page itself, which an anchored section is kept clear of by `PHONE_SCROLL_MARGIN`
 * (`SectionRail.tsx`), the larger of the two figures.
 *
 * How little it can show is a device's answer and not a documented one, and five is the floor: at
 * four the status bar goes back to the paper, as it does at two. Every pixel of the sliver is one
 * the rail gives back out of its own top padding, so this is the smallest that holds rather than a
 * comfortable margin — and the rail solves its padding from it, so moving it cannot leave the two
 * disagreeing.
 */
export const BROWSER_TINT_HEIGHT = 15;
export const BROWSER_TINT_VISIBLE = 5;

/**
 * Whether the page has scrolled past the app bar — the boundary the phone's status-bar tint
 * (`BrowserTint.tsx`)
 * and its `theme-color` metas (`Google.tsx`) key on too: past it, the app bar has left the screen
 * and nothing else at that edge still says which tab is open, so the top of the page can stop
 * wearing the tab's own colour and read as the page instead.
 *
 * One `scroll` listener for the page, lazily attached on first use and fanned out to every caller
 * through the shared store — the trade `useMatchMedia.ts` makes for a media query, for the same
 * reason: a caller asks per component instance, and minting a fresh listener each would be one per
 * caller rather than one for the page. `createStore` is what holds the value and the subscribers,
 * so this file states only the listener and the threshold.
 */
const pastBarStore = createStore(false);

let listening = false;

// A set to the value already held notifies nobody (`store.ts`), so a scroll that crosses neither
// edge of the dead band costs no render in any caller.
const readScroll = () => pastBarStore.set(scrolledPastBar(window.scrollY, pastBarStore.get()));

/**
 * The listener, attached on the first caller's first render rather than on import: `window` is a
 * browser global, and reaching for one while the module loads makes importing it throw where there
 * is none. The first read runs in the same guard, so a page restored mid-scroll answers correctly
 * on its first paint; it lands before anything has subscribed, so it notifies nobody.
 */
const listenToScroll = () => {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();
};

/** Live, re-rendering the caller the moment the page crosses the app bar in either direction. */
export const useScrolledPastBar = () => {
  listenToScroll();
  return pastBarStore.useValue();
};
