import type { Theme } from "@mui/material";

/**
 * What keeps a sideways scroller's own flick inside the page.
 *
 * A drag that reaches either end of a row otherwise carries on into the browser's own back
 * gesture, so a reader reaching for the next picture, chip or column leaves the page instead.
 * Every horizontal scroller in the app wears it — the charts four viewports wide, the strips, the
 * chip rails and the sized card rows — because the gesture is the same one whatever is being
 * scrolled past.
 */
export const CONTAIN_SIDEWAYS_SCROLL = { overscrollBehaviorX: "contain" } as const;

/**
 * A single-row scroller: contained, and with no scrollbar drawn under it.
 *
 * A bar under a row one control or one chip tall costs as much height as the row itself, so the
 * rows made of the kit — the section rail's chips and its actions, a card header's controls —
 * scroll silently and say there is more through `ScrollFade` instead. Both engines are named:
 * `scrollbar-width` for Firefox and the pseudo-element elsewhere, since neither covers the other.
 */
export const QUIET_SIDEWAYS_SCROLL = {
  ...CONTAIN_SIDEWAYS_SCROLL,
  scrollbarWidth: "none",
  // The `&` is what makes it this element's own bar: without it emotion nests the pseudo-element
  // under a descendant combinator and the rule lands on a scrollbar the children draw instead.
  "&::-webkit-scrollbar": { display: "none" },
} as const;

/**
 * A scroll container's own scrollbar, drawn from the theme's two tokens.
 *
 * Styling it at all is what opts macOS out of overlay scrollbars, which hide themselves the moment
 * scrolling stops; a thumb that stays says both that there is more and how much, at no cost per
 * frame. Both halves are given — `scrollbar-width`/`scrollbar-color` for Firefox, the
 * `::-webkit-scrollbar` pseudo-elements elsewhere — because neither covers every engine.
 *
 * One recipe rather than a copy per scroller: the three that want it differ only in how thick the
 * bar is, and a change to either token or to the thumb's treatment has to reach all of them.
 */
export const scrollbarSx = (theme: Theme, size = 10) => ({
  scrollbarWidth: "thin",
  scrollbarColor: `${theme.vars.palette.text.secondary} ${theme.vars.palette.divider}`,
  "&::-webkit-scrollbar": { width: size, height: size },
  "&::-webkit-scrollbar-track": { backgroundColor: theme.vars.palette.divider, borderRadius: size / 2 },
  "&::-webkit-scrollbar-thumb": { backgroundColor: theme.vars.palette.text.secondary, borderRadius: size / 2 },
});
