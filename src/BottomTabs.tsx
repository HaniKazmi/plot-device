import { BottomNavigation, BottomNavigationAction, Box, Paper, type Theme } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Tabs, { barColour, useCurrentTab } from "./tabs";
import { usePhone } from "./common/breakpoints";
import { useScheme } from "./common/useScheme";
import { APP_BAR_HEIGHT, BOTTOM_TABS_CLEARANCE, BOTTOM_TABS_HEIGHT } from "./common/chrome";
import { dismissPhoneBarTabs, setPhoneBarSlot, usePhoneBarTabsAsked } from "./common/phoneBar";

/**
 * How long a state takes to give way to the other, and the rule that turns it off.
 *
 * A cross-fade rather than a slide: the two states are the same bar saying two different things,
 * where anything travelling would read as a second bar arriving. Short enough that a flick past the
 * app bar does not leave the reader watching the swap.
 */
const SWAP_MS = 160;

const swapSx = (shown: boolean) => ({
  gridArea: "1 / 1",
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  opacity: shown ? 1 : 0,
  // Visibility as well as opacity, so the hidden state takes neither a tap nor the focus ring: it
  // is a live row of controls sitting exactly under the one on screen. It transitions discretely at
  // the end of the fade, which is what keeps the outgoing state pressable until it has gone.
  visibility: shown ? "visible" : "hidden",
  transition: `opacity ${SWAP_MS}ms ease, visibility ${SWAP_MS}ms`,
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
});

/** One cell, both states in it, at the bar's own height. */
const SWAP_BOX_SX = { display: "grid", height: `${BOTTOM_TABS_HEIGHT}px` } as const;

/**
 * The row the page's rail draws itself into: its tab chip, its section chips and its page chip, in
 * the page's own gutter inside whatever the device reserves at the sides, so the leading chip stands
 * where the first card of every row above it does.
 */
const RAIL_ROW_SX = { gap: 1, paddingX: 2 } as const;

/**
 * The one bar at the bottom of a phone's screen, in either of the two states it swaps between.
 *
 * At the top of the page it is the five tabs. The app bar is `position: static`, so a screen into a
 * page there is no way to change tab at all; a strip up there is also the far corner of a phone from
 * the hand holding it. Fixed to the bottom, the tabs are reachable from the thumb, which is what no
 * arrangement of the app bar achieves.
 *
 * Once the page is scrolled past the app bar it becomes the page's own rail — the section chips and
 * the page chip a wider screen pins under the app bar (`SectionRail`, which renders into this bar
 * through `common/phoneBar.ts` rather than at the top of the page). One bar rather than two is 49px
 * of a 720px screen given back to the page, on the platform where height is scarcest and where the
 * rail and the tabs would otherwise be stacked at the same edge. The swap is keyed on the same
 * question the top rail's own pin is — whether the app bar has left the screen — so the rail appears
 * exactly where it would have pinned.
 *
 * The rail leads with a chip carrying the current tab's own icon, which calls the tabs back **in
 * place**, without moving the page: the alternative, scrolling to the top, is where the tabs already are, and on a
 * library wall seventy thousand pixels deep it costs the reader their position to answer a question
 * about navigation. The next scroll takes the tabs away again. Tapping the tab already open there
 * scrolls to the top anyway (`BottomNavigation` answers a press on the selected action), so the
 * journey back exists without the chip having to be it.
 *
 * The tabs wear the tab's own bar colour (`barColour`, the single answer for that) so the top and
 * bottom edges of a phone say the same thing about which tab is open, and in the dark scheme the 3px
 * rule runs along the top edge as the app bar carries it along its bottom — the tint alone is a
 * fifth of the primary's strength and needs the line to carry the hue. The rail state stands on the
 * page's own ground instead, ruled off with a hairline: its chips are the kit's, which are solved
 * against `background.default` — a lit chip is filled in the primary, invisible on a bar that *is*
 * the primary, and the page chip's picker face reads the same way.
 *
 * Rendered at every width and hidden from `sm`, where the app bar's own strip is drawn instead.
 */
export const BottomTabs = () => {
  const navigate = useNavigate();
  const currTab = useCurrentTab();
  const scheme = useScheme();
  const phone = usePhone();
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
  // Whether the page is still against the app bar, and whether the reader has asked for the tabs
  // back below it. Two answers rather than one: the request is the reader's and survives until they
  // scroll, where the offset is the page's and answers again on every event. The request is a store
  // because the chip that makes it is in the rail, which is drawn from inside this bar by a page
  // several levels down the tree (`phoneBar.ts`).
  const [atTop, setAtTop] = useState(true);
  const tabsAsked = usePhoneBarTabsAsked();
  const tabsShown = atTop || tabsAsked;

  useEffect(() => {
    // Nothing to swap where the bar is not drawn, so a desktop pays no listener at all. Keyed on
    // the width, so a phone turned sideways past `sm` drops it and turned back gets it again.
    if (!phone) return;
    const read = () => {
      const top = window.scrollY <= APP_BAR_HEIGHT;
      // Both are sets to the value already held on most events, which React drops without a render:
      // a scroll that crosses nothing costs nothing.
      setAtTop(top);
      // The reader's own scroll is what takes the called-back tabs away again. Only below the app
      // bar: above it the tabs are the state anyway, and clearing there would leave the flag set
      // for the next crossing.
      if (!top) dismissPhoneBarTabs();
    };
    // Read once rather than waiting for a scroll: a reload restores the offset, and a page that
    // comes back mid-wall would otherwise open showing the tabs over content it is not at the top
    // of.
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, [phone]);

  return (
    <Paper
      square
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: { sm: "none" },
        // Under a dialog and the app bar's own menus, over every page it covers.
        zIndex: (theme) => theme.zIndex.appBar,
        backgroundColor: tabsShown ? ground : "background.default",
        transition: `background-color ${SWAP_MS}ms ease`,
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        // `border-box` from `CssBaseline`, so the safe area has to be added to the height rather
        // than taken out of the actions' own.
        height: BOTTOM_TABS_CLEARANCE,
        paddingBottom: "env(safe-area-inset-bottom)",
        // Held sideways the screen's corners cover the ends of a full-width bar, so what is in it
        // stops short of them. No gutter of its own to add to: the actions divide whatever is left
        // (`safeAreaGutters` states the rule for the surfaces that do have one).
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        // The rule the rail state is separated from the page by, and the tabs' own coloured edge in
        // the dark scheme. One at a time: the bar is either page furniture on the page's ground or a
        // filled bar, and both edges at once would be a hairline under a coloured line.
        // An inset shadow in both states rather than a border in one: a border is laid out, so the
        // hairline would push the bar's own 56px row down by a pixel while the coloured rule, drawn
        // inside, does not.
        ...(tabsShown
          ? rule && dark && { boxShadow: `inset 0 3px 0 0 ${rule}` }
          : { boxShadow: (theme: Theme) => `inset 0 1px 0 0 ${theme.vars.palette.divider}` }),
      }}
    >
      {/* One cell holding both states, so the bar is the height of one of them and the two cross
          fade in place rather than one pushing the other out. */}
      <Box sx={SWAP_BOX_SX}>
        <BottomNavigation
          showLabels
          value={currTab.id}
          onChange={(_, value: string) => {
            navigate(`/${value}`);
            // A tab change from deep in one page otherwise lands mid-scroll in the next, which the
            // rail's own tab chips avoid the same way. It is also what answers a press on the tab
            // already open: the page goes back to the top, where the tabs stay drawn.
            window.scrollTo({ top: 0 });
          }}
          sx={{
            ...swapSx(tabsShown),
            height: BOTTOM_TABS_HEIGHT,
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
        {/* The rail draws itself in here, so what a page's chips are — and the chip calling the
            tabs back — stays with the page, and this bar carries none of MUI's popper engine into
            the chunk every visitor evaluates before the first paint. */}
        <Box
          sx={{ ...swapSx(!tabsShown), ...RAIL_ROW_SX }}
          ref={setPhoneBarSlot}
        />
      </Box>
    </Paper>
  );
};
