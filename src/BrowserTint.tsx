import { Box } from "@mui/material";
import { useEffect } from "react";
import { barColour, useCurrentTab } from "./tabs";
import { BROWSER_TINT_HEIGHT, BROWSER_TINT_VISIBLE, useScrolledPastBar } from "./common/chrome";
import { usePhone } from "./common/breakpoints";
import { useScheme } from "./common/useScheme";

/**
 * The strip Safari samples to colour a phone's status bar, in the current tab's own bar colour.
 *
 * Safari 26 derives the colour of its chrome from the page rather than being told it: a
 * `theme-color` meta is still parsed and no longer read, and what is sampled is the
 * `background-color` of a qualifying fixed or sticky element, falling back to `body`. Left to that
 * fallback the answer is the paper, so the status bar reads as a band of blank page above a bar
 * that is anything but. The bottom edge is already a fixed full-width bar (`BottomTabs`), which
 * wears the tab's colour at every scroll position and is sampled for the bottom of the chrome; only
 * the top has nothing of its own up there to sample.
 *
 * Below `sm` the strip is drawn while the app bar is still on screen and taken away past it
 * (`useScrolledPastBar`). Left standing throughout,
 * a phone scrolled deep into a library reads a coloured band at the very top of an otherwise plain
 * page, naming a bar that scrolled out of reach screens ago; taken away, nothing at that edge is
 * fixed and Safari draws its own translucent status bar over the page, which is a transparency a
 * stated ground can only imitate. The `theme-color` metas (`Google.tsx`) answer for the browsers
 * that do read one, stating the page's own ground there rather than leaving. From `sm` up the strip
 * keeps the tab's colour at every scroll position: the pinned rail beneath it is its own separate
 * surface, not sampled.
 *
 * What a strip has to be is measured rather than declared: an element that anything paints over is
 * never sampled, which is what the `zIndex` is for — the section rail pins opaque one below the app
 * bar, and a strip beneath it would stop answering the moment the rail reached the top. A strip
 * standing 3px high is not sampled either, the floor being nearer 12, so it stands
 * `BROWSER_TINT_HEIGHT` and hangs above the edge, showing the `BROWSER_TINT_VISIBLE` sliver that
 * has to be on screen and no more — from `sm` up every pixel of it is one the section rail gives up
 * out of its own top padding (`chrome.ts`), and below that width it lies over the page, which keeps
 * an anchored section clear of it by a larger margin. `visibility: hidden` is not sampled at all, so there is no drawing
 * it and hiding it.
 *
 * Under a coarse pointer alone, because the two platforms sample on different schedules and only
 * one can be kept honest. iOS re-samples as the page changes, so the strip follows a tab change and
 * the scheme flipping at dusk. A desktop samples once at first paint and never again — ignoring an
 * element mounted afterwards, a recolour of one already there, and the reader switching to dark
 * mode alike — so a strip there would state one tab's colour for the whole visit and go on stating
 * it after the page had moved on. A desktop is left to sample `body`, which is at least the colour
 * the page actually is.
 *
 * Live sampling is also what lets this be a component at all: the strip is drawn here, from
 * `barColour`, rather than declared in `index.html`, where the tab colours would have to be
 * restated in a file nothing type-checks. It costs the paper's own colour in the status bar for the
 * frame before React mounts.
 *
 * A tab with no bar colour of its own draws no strip, leaving Safari the paper it would have
 * sampled anyway.
 */

export const BrowserTint = () => {
  const currTab = useCurrentTab();
  const scheme = useScheme();
  const phone = usePhone();
  const past = useScrolledPastBar();
  const ground = barColour(currTab, scheme);
  // The same boundary, published on the root element for the document's own background to read
  // (`Google.tsx`, the `CssBaseline` override): Safari extends that background under the status bar
  // and past the page's ends, so it is the bar's colour while the page is against the app bar —
  // where a pull past the top would otherwise open a band of paper between the status bar and the
  // bar — and the page's ground once past it, where a bar colour would tint the status bar over a
  // page that has scrolled the bar away. An attribute rather than a style, so the colours stay
  // stated once, in the theme, beside the rule that reads them.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-past-bar", phone && past);
  }, [phone, past]);
  // Past the bar the strip is not drawn: with nothing fixed at the top to sample, Safari draws its
  // own translucent status bar over the page — the meta stated there for the browsers that read one
  // is not one Safari reads.
  if (!ground || (phone && past)) return null;
  const background = ground;

  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        display: "none",
        "@media (pointer: coarse)": {
          display: "block",
          position: "fixed",
          top: `${BROWSER_TINT_VISIBLE - BROWSER_TINT_HEIGHT}px`,
          left: 0,
          right: 0,
          height: `${BROWSER_TINT_HEIGHT}px`,
          zIndex: theme.zIndex.appBar + 1,
          // It lies across the top of the page, and a strip that answered a tap would take one
          // meant for whatever it covers.
          pointerEvents: "none",
          // No transition on the colour: the strip is mounted while the tab's colour is what the
          // top edge is, and taken away rather than recoloured once it is not, so the only changes
          // left are a tab change and the scheme flipping at dusk, neither of which is a state of
          // this element crossing to another.
          backgroundColor: background,
        },
      })}
    />
  );
};
