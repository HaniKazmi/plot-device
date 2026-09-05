import { Box } from "@mui/material";
import { barColour, useCurrentTab } from "./tabs";
import { BROWSER_TINT_HEIGHT, BROWSER_TINT_VISIBLE } from "./common/chrome";
import { useScheme } from "./common/useScheme";

/**
 * The strip Safari samples to colour a phone's status bar, in the current tab's own bar colour.
 *
 * Safari 26 derives the colour of its chrome from the page rather than being told it: a
 * `theme-color` meta is still parsed and no longer read, and what is sampled is the
 * `background-color` of a qualifying fixed or sticky element, falling back to `body`. Left to that
 * fallback the answer is the paper, so the status bar reads as a band of blank page above a bar
 * that is anything but. `BottomTabs` already answers for the bottom edge, being a fixed full-width
 * bar in this colour, which is why only the top needs stating.
 *
 * What a strip has to be is measured rather than declared: an element that anything paints over is
 * never sampled, which is what the `zIndex` is for — the section rail pins opaque one below the app
 * bar, and a strip beneath it would stop answering the moment the rail reached the top. A strip
 * standing 3px high is not sampled either, the floor being nearer 12, so it stands
 * `BROWSER_TINT_HEIGHT` and hangs above the edge, showing the `BROWSER_TINT_VISIBLE` sliver that
 * has to be on screen and no more — every pixel of it is one the section rail gives up out of its
 * own top padding (`chrome.ts`). `visibility: hidden` is not sampled at all, so there is no drawing
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
  const ground = barColour(currTab, scheme);

  if (!ground) return null;

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
          backgroundColor: ground,
        },
      })}
    />
  );
};
