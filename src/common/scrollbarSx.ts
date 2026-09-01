import type { Theme } from "@mui/material";

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
