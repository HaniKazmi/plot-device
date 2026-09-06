import { BottomNavigation, BottomNavigationAction, Box, Paper, type Theme } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Tabs, { barColour, useCurrentTab } from "./tabs";
import { usePhone } from "./common/breakpoints";
import { useScheme } from "./common/useScheme";
import { BOTTOM_TABS_CLEARANCE, BOTTOM_TABS_HEIGHT, PHONE_RAIL_HEIGHT } from "./common/chrome";
import { onBarSx } from "./common/barTone";
import { setPhoneBarSlot } from "./common/phoneBar";

/**
 * How long the tab row takes to fold or return. Short enough that a flick down the page does not
 * leave the reader watching it go; a height rather than a fade, so the rail row slides to the edge
 * the thumb rests at instead of standing over an empty band.
 */
const FOLD_MS = 180;

/**
 * How far the page has to move, in one direction, before the tab row answers, and how near the top
 * the tabs stay up regardless.
 *
 * Momentum scrolling and a thumb resting on the glass both deliver a stream of events a pixel or
 * two apart in either direction; asking for a few before turning keeps the row from flickering
 * between them. Near the top the tabs stay up whichever way the last movement went, since the
 * page's first screen is where the tabs are expected and a rubber band there would fold them.
 */
const FOLD_SLACK = 6;
const TABS_UP_NEAR_TOP = 64;

/**
 * Whether the tab row is up: the page is near its top, or the reader's last movement was upward.
 *
 * Direction rather than position, because the two things the bar carries are wanted at different
 * moments. The rail — sections, measure, filters — is used while reading down a page, and stays
 * on the bottom edge at every position; the tabs are used between pages, and a scroll back up is
 * the gesture that says the reader is done with this one. Folding them on the way down gives that
 * reading the tab row's 56px, on the screen where height is scarcest, without a second tap to get
 * them back. Held as component state on the bar's own listener rather than in a shared store: the
 * bar is the only surface that reads the direction, where the crossing of the app bar
 * (`useScrolledPastBar`) is read by three.
 */
const useTabsUp = () => {
  const [up, setUp] = useState(true);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      if (y < TABS_UP_NEAR_TOP) setUp(true);
      else if (delta > FOLD_SLACK) setUp(false);
      else if (delta < -FOLD_SLACK) setUp(true);
      // The reference moves only with a movement that counted, so a slow drift of single pixels
      // still adds up to a turn rather than resetting under itself.
      if (Math.abs(delta) > FOLD_SLACK) last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return up;
};

/**
 * The row the page's rail stands in, in the page's own gutter inside whatever the device reserves
 * at the sides, so the first chip stands where the first card of every row above it does.
 */
const RAIL_ROW_SX = { gap: 1, paddingX: 2, display: "flex", alignItems: "center", height: PHONE_RAIL_HEIGHT } as const;

/**
 * The rail's own cell inside that row: no box of its own, so the chips and controls the page
 * portals in are the row's flex children.
 */
const SLOT_SX = { display: "contents" } as const;

/**
 * The one bar at the bottom of a phone's screen: the page's rail along the bottom edge, and the
 * five tabs above it while they are wanted.
 *
 * The rail row is the section chips and the page chip a wider screen pins under the app bar
 * (`SectionRail`, which renders into this bar through `common/phoneBar.ts` rather than at the top
 * of the page). It is always there, at the edge the thumb rests on, because it is what a page is
 * read through — sections, the measure, the filters. Above it the tabs, which the app bar's
 * `position: static` strip cannot offer a screen into a page and which are the far corner of a
 * phone from the hand holding it even where it can. Both at the bottom rather than the rail pinned
 * at the top, since the rail is the row used most while reading and the top is where the eye is,
 * not the thumb.
 *
 * The tab row folds on the way down and returns on the way up (`useTabsUp`), so most of a page is
 * read under a 40px bar and a tab is one tap away the moment the reader turns back. The page
 * clears the bar at its full height throughout, so nothing under the fold moves as the row folds.
 *
 * The bar wears the tab's own colour (`barColour`, the single answer for that) so the top and
 * bottom edges of a phone say the same thing about which tab is open, and in the dark scheme the
 * 3px rule runs along its top edge as the app bar carries it along its bottom — the tint alone is
 * a fifth of the primary's strength and needs the line to carry the hue. The rail's parts are the
 * kit's, solved against the page ground — a lit chip is filled in the primary, invisible on a bar
 * that *is* the primary — so they are re-toned onto the bar through `onBarSx`
 * (`common/barTone.ts`).
 *
 * Drawn on a phone alone: from `sm` up the app bar's own strip holds the tabs and the rail pins
 * under it.
 */
export const BottomTabs = () => {
  const navigate = useNavigate();
  const currTab = useCurrentTab();
  const scheme = useScheme();
  const phone = usePhone();
  const tabsUp = useTabsUp();
  const dark = scheme === "dark";
  const ground = barColour(currTab, scheme);
  const rule = currTab.darkBar?.rule;
  // The dark scheme's bar is a 22% tint, so the tab in hand takes the same lighter ink the wordmark
  // and the app bar's own active label wear. On the light paper the bar *is* the primary, and MUI's
  // own selected colour is that same primary — the current tab drawn in the colour it is drawn on.
  const activeInk = dark ? currTab.darkBar?.ink : undefined;
  // The ink the bar's own text takes: the contrast colour over the light scheme's full-strength
  // primary, the dark scheme's own text over its tint.
  const barInk = (theme: Theme) => (dark ? theme.vars.palette.text.primary : theme.vars.palette.primary.contrastText);

  // Nothing at all from `sm` up, where the app bar's own strip holds the tabs and the rail pins
  // under it: a bar hidden by a `display` rule still publishes the slot the page's rail portals
  // into, which would leave that rail drawn into a bar nobody can see. After the hooks, which run
  // whatever the width.
  if (!phone) return null;

  return (
    <Paper
      square
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        // Under a dialog and the app bar's own menus, over every page it covers.
        zIndex: (theme) => theme.zIndex.appBar,
        backgroundColor: ground,
        // `border-box` from `CssBaseline`, so the safe area has to be added to the height rather
        // than taken out of the rows' own. The bar itself shrinks with the tab row, so the page
        // shows through where the tabs were rather than a band of the bar's colour under nothing.
        height: tabsUp ? BOTTOM_TABS_CLEARANCE : `calc(${PHONE_RAIL_HEIGHT}px + env(safe-area-inset-bottom))`,
        transition: `height ${FOLD_MS}ms ease`,
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        paddingBottom: "env(safe-area-inset-bottom)",
        // Held sideways the screen's corners cover the ends of a full-width bar, so what is in it
        // stops short of them. No gutter of its own to add to: the actions divide whatever is left
        // (`safeAreaGutters` states the rule for the surfaces that do have one).
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        // The dark scheme's coloured rule along the top edge, carrying the hue a 22% tint alone
        // cannot. An inset shadow rather than a border: a border is laid out, so it would push the
        // rows down by a pixel where a shadow drawn inside does not.
        ...(rule && dark && { boxShadow: `inset 0 3px 0 0 ${rule}` }),
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box
          sx={[
            RAIL_ROW_SX,
            {
              // The line between the two rows, drawn only while there are two: folded, it would be
              // a rule along the bar's bottom edge under nothing.
              boxShadow: (theme: Theme) => (tabsUp ? `inset 0 -1px 0 0 ${rule ?? theme.vars.palette.divider}` : "none"),
            },
            onBarSx(dark, ground),
          ]}
        >
          <Box
            sx={SLOT_SX}
            ref={setPhoneBarSlot}
          />
        </Box>
        <BottomNavigation
          showLabels
          value={currTab.id}
          onChange={(_, value: string) => {
            navigate(`/${value}`);
            // A tab change from deep in one page otherwise lands mid-scroll in the next, which the
            // rail's own tab chips avoid the same way. It is also what answers a press on the tab
            // already open: the page goes back to the top.
            window.scrollTo({ top: 0 });
          }}
          sx={{
            // Folded to nothing rather than hidden, so the rail row above slides to the edge.
            height: tabsUp ? BOTTOM_TABS_HEIGHT : 0,
            overflow: "hidden",
            transition: `height ${FOLD_MS}ms ease`,
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            backgroundColor: "transparent",
            // Five actions at MUI's own 80px floor want 400px of a 390px phone. Nothing here needs
            // a floor: the labels are one short word each and the row divides evenly.
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              paddingX: 0.5,
              // Opacity rather than a mix, since both halves of `barInk` are CSS variables under
              // `cssVariables: true` and cannot be faded by a colour function.
              color: barInk,
              opacity: 0.7,
            },
            "& .MuiBottomNavigationAction-root.Mui-selected": {
              opacity: 1,
              color: (theme) => activeInk ?? barInk(theme),
            },
            "& .MuiBottomNavigationAction-label": { fontSize: "0.6875rem" },
            "& .MuiBottomNavigationAction-label.Mui-selected": { fontSize: "0.6875rem" },
          }}
        >
          {Tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <BottomNavigationAction
                key={`bottomtab-${tab.id}`}
                value={tab.id}
                label={tab.name}
                icon={<Icon />}
              />
            );
          })}
        </BottomNavigation>
      </Box>
    </Paper>
  );
};
