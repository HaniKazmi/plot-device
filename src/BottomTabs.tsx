import { BottomNavigation, BottomNavigationAction, Paper, type Theme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Tabs, { barColour, useCurrentTab } from "./tabs";
import { useScheme } from "./common/useScheme";
import { BOTTOM_TABS_CLEARANCE, BOTTOM_TABS_HEIGHT } from "./common/chrome";

/**
 * The five tabs, at the bottom of a phone's screen.
 *
 * The app bar is `position: static`, so a screen into a page there is no way to change tab at all;
 * a strip up there is also the far corner of a phone from the hand holding it. Fixed to the
 * bottom, the tabs are reachable from any scroll position and from the thumb, which is what no
 * arrangement of the app bar achieves.
 *
 * It wears the tab's own bar colour (`barColour`, the single answer for that), so the top and
 * bottom edges of a phone say the same thing about which tab is open, and in the dark scheme the
 * 3px rule runs along its top edge as the app bar carries it along its bottom — the tint alone is
 * a fifth of the primary's strength and needs the line to carry the hue.
 *
 * Rendered at every width and hidden from `sm`, where the app bar's own strip is drawn instead.
 */
export const BottomTabs = () => {
  const navigate = useNavigate();
  const currTab = useCurrentTab();
  const scheme = useScheme();
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
        backgroundColor: ground,
        // `border-box` from `CssBaseline`, so the safe area has to be added to the height rather
        // than taken out of the actions' own.
        height: BOTTOM_TABS_CLEARANCE,
        paddingBottom: "env(safe-area-inset-bottom)",
        // Held sideways the screen's corners cover the ends of a full-width bar, so the row of
        // five stops short of them. No gutter of its own to add to: the actions divide whatever is
        // left (`safeAreaGutters` states the rule for the surfaces that do have one).
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        ...(rule && dark && { boxShadow: `inset 0 3px 0 0 ${rule}` }),
      }}
    >
      <BottomNavigation
        showLabels
        value={currTab.id}
        onChange={(_, value: string) => {
          navigate(`/${value}`);
          // A tab change from deep in one page otherwise lands mid-scroll in the next, which the
          // rail's own tab chips avoid the same way.
          window.scrollTo({ top: 0 });
        }}
        sx={{
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
    </Paper>
  );
};
