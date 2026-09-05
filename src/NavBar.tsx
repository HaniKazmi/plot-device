import {
  AppBar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tab as MuiTab,
  Tabs as MuiTabs,
  Toolbar,
  Typography,
} from "@mui/material";
import { MoreVert, Search } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Tabs, { useCurrentTab } from "./tabs";
import useLongPress from "./utils/useLongPress";
import { useGoogleAuth } from "./contexts/GoogleAuthContext";
import { safeAreaGutters } from "./common/chrome";
import { openSearch } from "./common/searchOpen";
import { AppIcon } from "./AppIcon";

/**
 * The menu's own items are worded rather than keyed, and the theme capitalises every `MenuItem`
 * so that a bare model key reads as a word — which turns "Guest mode" into "Guest Mode". The
 * select boxes state the same override for the same reason.
 */
const MENU_ITEM_SX = { textTransform: "none" } as const;

/**
 * A disabled button on the bar takes the theme's own disabled grey, a colour the bar — the tab's
 * primary on the light paper, its tint on the dark — does not have anywhere else. The bar's ink,
 * stepped back, says the same thing in the bar's own terms.
 */
const DISABLED_BUTTON_SX = { "&.Mui-disabled": { color: "inherit", opacity: 0.6 } } as const;

/**
 * A finger has no long press to reach guest mode with — that gesture is the pointer's alone, and on
 * touch it collides with the browser's own press-and-hold — so the menu is the only handle on the
 * mode and is drawn at every width where a finger is the pointer. A tablet held sideways is `md`,
 * and the coarse-pointer rule states its `display` after the width rule above it so it wins there.
 * It costs a menu repeating the two buttons beside it, which is what a ⋮ is for.
 */
const MENU_BUTTON_SX = {
  display: { md: "none" },
  "@media (pointer: coarse)": { display: "flex" },
} as const;

/**
 * The search button is the bar's last child wherever the ⋮ is not drawn, and `edge="end"` is the
 * last child's alone — it pulls the button into the bar's gutter so its icon lines up with the
 * page edge, and two buttons wearing it overlap. Stated by the same two rules that draw the ⋮, so
 * the two cannot disagree about which of them is last.
 */
const SEARCH_BUTTON_SX = {
  marginRight: { md: -1.5 },
  "@media (pointer: coarse)": { marginRight: 0 },
} as const;

/**
 * What the bar can do, built once and drawn twice: as buttons from `md` up, and as the items of the
 * overflow menu. Both are on screen at once wherever a finger is the pointer, so two lists would be
 * two chances for the bar and the menu to disagree — over whether "Authorising" is a live control,
 * or over an action one of them gained and the other did not. Guest mode is the one item outside
 * this list: the buttons have no room for a mode switch, and the menu is its only handle.
 */
type BarAction = { label: string; href?: string; onClick?: () => void; disabled?: boolean };

/**
 * An action with a destination is a link and opens in its own tab; one without is a button. Given
 * as a spread rather than as separate props, since `target` types only against a `href` that is
 * certainly there.
 */
const linkProps = (action: BarAction) => (action.href ? { href: action.href, target: "_blank" } : {});

const NavBar = ({ guestMode, setGuestMode }: { guestMode: boolean; setGuestMode: (value: boolean) => void }) => {
  const navigate = useNavigate();
  const currTab = useCurrentTab();
  // The hook answers with the pointer's handlers alone, which is why the overflow menu offers guest
  // mode outright: a finger has no long press to reach it with.
  const { onMouseDown, onMouseUp, onMouseLeave } = useLongPress(() => setGuestMode(true));
  const { authorise, revoke } = useGoogleAuth();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  // A tab with no `darkBar` (none currently exist) keeps the plain dark bar `Google.tsx` falls
  // back to, so nothing here draws a rule or an ink colour with nothing to derive them from.
  const darkBar = currTab.darkBar;

  const sheetHref = `https://docs.google.com/spreadsheets/d/${currTab.spreadsheetId}`;
  const closeMenu = () => setMenuAnchor(null);

  const actions: BarAction[] = [
    // Only where the tab has a sheet of its own. A tab composing several has no single one to
    // open, and the action would otherwise link to `/d/undefined`.
    ...(currTab.spreadsheetId ? [{ label: "Sheet", href: sheetHref }] : []),
    // The three auth states are told apart by which of the two callbacks the context exposes, so
    // neither present is the state where it is still loading.
    ...(!authorise && !revoke ? [{ label: "Authorising", disabled: true }] : []),
    ...(authorise ? [{ label: "Authorise", onClick: authorise }] : []),
    ...(revoke ? [{ label: "Revoke", onClick: revoke }] : []),
  ];

  return (
    <AppBar
      position="static"
      sx={(theme) => ({
        marginBottom: theme.spacing(2),
        // The dark scheme paints the bar as a tint rather than the full-strength primary
        // (`Google.tsx`), so a 3px rule in the primary's own hue is what still tells five tabs
        // apart at a glance. An inset shadow rather than a border keeps the bar the same height
        // in both schemes — a border would shift every reader's scroll position by 3px on the
        // system's own light/dark switch, which this app repaints live (`useScheme.ts`).
        // `applyStyles` rather than `theme.palette.mode`, which reads the light scheme's literal
        // under `cssVariables: true` regardless of which paper is on screen (AGENTS.md).
        ...(darkBar && theme.applyStyles("dark", { boxShadow: `inset 0 -3px 0 0 ${darkBar.rule}` })),
      })}
    >
      {/* The bar reaches the edges of the screen, so its own gutters carry the device's insets. */}
      <Toolbar sx={safeAreaGutters}>
        <AppIcon sx={{ display: "flex", mr: 1 }} />
        {/* `cursive` is a generic family, so the wordmark resolves to Snell Roundhand on macOS and
            to something else on every other platform — the one piece of the page whose shape is
            decided by the reader's OS. Weight and tracking give it the same treatment the index at
            hani.fyi and the status page use, which `system-ui` renders identically everywhere.

            Shown at every width: at this size it costs the tabs about six characters, where the h6
            it replaces cost enough to be worth hiding on a phone. It also carries the long press
            that opens guest mode, rather than the whole bar: a bar holding a tab strip and a menu
            button is three hundred pixels of surface where a press landing on none of them
            changes what the page shows. */}
        <Typography
          noWrap
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          sx={(theme) => ({
            mr: { xs: 1, md: 2 },
            // The tab strip beside it scrolls; the wordmark does not give way to it.
            flexShrink: 0,
            fontSize: "0.875rem",
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            // The inherited colour is the bar's own dark text (`Google.tsx`'s
            // `AppBar.darkColor`); the wordmark takes the tab's own ink instead, the same
            // treatment the active tab label gets below.
            ...(darkBar && theme.applyStyles("dark", { color: darkBar.ink })),
          })}
        >
          Plot Device
        </Typography>
        {/* `minWidth: 0` is what lets the strip scroll rather than widen the page: a flex item's floor
            is its content's width, and five tabs at their own minimum run past a phone's. The
            scroll buttons appear only where the strip overflows on a device with a pointer: a
            swipe reaches the last tab on a phone, but a mouse in a narrow desktop window has no
            other way there, since the strip hides its scrollbar.

            Below `sm` the strip is not drawn at all — the bottom navigation holds the five tabs,
            where a thumb is — and this box stays as the spacer that pushes the menu button to the
            far end. */}
        <Box sx={{ flexGrow: 1, display: "flex", minWidth: 0 }}>
          <MuiTabs
            variant="scrollable"
            scrollButtons="auto"
            textColor="inherit"
            indicatorColor="secondary"
            value={currTab.id}
            onChange={(_, value: string) => {
              navigate(value);
            }}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            {Tabs.map((tab) => {
              const isCurrent = tab.id === currTab.id;
              const tabDarkBar = tab.darkBar;
              return (
                <MuiTab
                  key={`muitab-${tab.id}`}
                  label={tab.name}
                  value={tab.id}
                  // Only the selected label needs its own ink: `textColor="inherit"` already
                  // renders the rest at reduced opacity, which is dimming enough to tell them
                  // from the one that is current.
                  sx={
                    isCurrent && tabDarkBar
                      ? (theme) => theme.applyStyles("dark", { color: tabDarkBar.ink })
                      : undefined
                  }
                />
              );
            })}
          </MuiTabs>
        </Box>
        {/* The buttons stand in the bar only from `md`. At 768 the wordmark, five tabs and two
            buttons want about 800px of a 720px content width, so below that they are the overflow
            menu's items and the bar keeps one row at every size. */}
        <Box sx={{ display: { xs: "none", md: "flex" }, flexShrink: 0 }}>
          {actions.map((action) => (
            <Button
              key={action.label}
              color="inherit"
              {...linkProps(action)}
              onClick={action.onClick}
              disabled={action.disabled}
              sx={DISABLED_BUTTON_SX}
            >
              {action.label}
            </Button>
          ))}
        </Box>
        {/* At every width: below `sm` the bar is a wordmark, this and the ⋮, the tabs having gone to
            the bottom of the screen, so the box stands in the space the strip left. A button rather
            than a `BarAction`, which is text-only and, under a finger, a menu item — a search box
            two taps away is one nobody opens. ⌘K and `/` reach the same palette (`omnibus/Search`). */}
        <IconButton
          color="inherit"
          aria-label="Search"
          aria-keyshortcuts="Meta+K Control+K /"
          onClick={openSearch}
          sx={SEARCH_BUTTON_SX}
        >
          <Search />
        </IconButton>
        <IconButton
          color="inherit"
          edge="end"
          aria-label="More"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={MENU_BUTTON_SX}
        >
          <MoreVert />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={closeMenu}
        >
          {actions.map((action) => (
            <MenuItem
              key={action.label}
              component={action.href ? "a" : "li"}
              {...linkProps(action)}
              disabled={action.disabled}
              onClick={() => {
                closeMenu();
                action.onClick?.();
              }}
              sx={MENU_ITEM_SX}
            >
              {action.label}
            </MenuItem>
          ))}
          {/* Both directions, because the menu is the only handle a touch reader has on the mode:
              the long press that turns it on is a pointer gesture, and without an item saying so
              leaving the mode is a reload. */}
          <MenuItem
            onClick={() => {
              closeMenu();
              setGuestMode(!guestMode);
            }}
            sx={MENU_ITEM_SX}
          >
            {guestMode ? "Leave guest mode" : "Guest mode"}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
