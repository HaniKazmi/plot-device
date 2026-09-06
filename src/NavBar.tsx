import {
  AppBar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tab as MuiTab,
  Tabs as MuiTabs,
  Toolbar,
  Typography,
} from "@mui/material";
import { Key, MoreVert, Search } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Tabs, { useCurrentTab } from "./tabs";
import useLongPress from "./utils/useLongPress";
import { useGoogleAuth } from "./contexts/GoogleAuthContext";
import { useAuthState } from "./app/authState";
import { safeAreaGutters } from "./common/chrome";
import { openSearch } from "./common/searchOpen";
import { AppIcon } from "./AppIcon";

/**
 * The bar's own buttons, against the kit's 28px square (`Google.tsx`).
 *
 * The bar is a filled surface with nothing beside these to be level with, where the page's
 * controls stand in a card header among segments and chips. A 28px square in a 64px bar reads as
 * a control that shrank, and `edge`'s negative margin — which is what lines the last icon up with
 * the page's own edge — is derived from the 40px target and its padding.
 */
const BAR_BUTTON_SX = {
  // Doubled, because the kit's square is stated on the theme's own `MuiIconButton` and both rules
  // are one class: which of the two lands last is the stylesheet's insertion order rather than
  // anything either of them states, and the theme's pointer query wins the tie at 32px. Two
  // classes outweigh one under every ordering.
  "&&": {
    width: 40,
    height: 40,
    padding: 1,
    borderRadius: "50%",
    // The kit hovers a control in the tab's primary, which is the colour this bar is painted in:
    // a wash of it over itself is nothing. The bar's own ink is light on either paper, so a wash
    // of white is the one that reads on both.
    "@media (hover: hover)": { "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.12)" } },
    "& .MuiSvgIcon-root": { fontSize: 24 },
  },
} as const;

/**
 * A disabled button on the bar takes the theme's own disabled grey, a colour the bar — the tab's
 * primary on the light paper, its tint on the dark — does not have anywhere else. The bar's ink,
 * stepped back, says the same thing in the bar's own terms.
 */
const DISABLED_BUTTON_SX = { "&.Mui-disabled": { color: "inherit", opacity: 0.6 } } as const;

/**
 * The authorise key wearing its word, which it can only do where there is room for one and a
 * pointer to read it with: a phone's bar is a wordmark and three targets, and a coarse pointer
 * wants the whole 40px square whatever the width. The two forms are one control drawn twice and
 * hidden by `display`, rather than a width read as a value — a hidden element is out of the
 * accessibility tree, so a reader is offered exactly one Authorise however wide the bar is.
 */
const KEY_ICON_SX = {
  display: { xs: "inline-flex", md: "none" },
  "@media (pointer: coarse)": { display: "inline-flex" },
} as const;

const KEY_WORD_SX = {
  display: { xs: "none", md: "inline-flex" },
  "@media (pointer: coarse)": { display: "none" },
} as const;

/**
 * The worded form of the same key: a pill rather than a square, and the bar's own type size, so it
 * reads as bar furniture beside the wordmark rather than as a card header's control shrunk into
 * the bar. Doubled for the reason `BAR_BUTTON_SX` is, and stated separately from it because that
 * one fixes a 40px circle a word cannot fit in.
 */
const BAR_WORD_SX = {
  "&&": {
    height: 40,
    minWidth: 0,
    padding: "0 12px",
    borderRadius: 20,
    fontSize: "0.875rem",
    fontWeight: 500,
    textTransform: "none",
    "@media (hover: hover)": { "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.12)" } },
    "& .MuiSvgIcon-root": { fontSize: 20 },
  },
  ...DISABLED_BUTTON_SX,
} as const;

/**
 * What the ⋮ holds: everything about the reader's session that is not the one thing the bar draws
 * for itself. One list and one surface, so nothing here can be reachable at one width and not
 * another — an iPad held sideways clears every width test and still points with a finger.
 */
type BarAction = { label: string; href?: string; onClick?: () => void };

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
  const authState = useAuthState();
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
    // Its counterpart is the bar's own key: authorising is the one thing a reader arriving at a
    // stale or empty page has to do, and a menu is two taps away from doing it. Giving a session
    // back is neither urgent nor frequent, so it stays here.
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
              const Icon = tab.icon;
              return (
                <MuiTab
                  key={`muitab-${tab.id}`}
                  label={tab.name}
                  // The glyph beside the word is what teaches it: the section rail names the other
                  // tabs by icon alone, where four words and a divider take a third of its row, and
                  // the bottom navigation already pairs the two on a phone. Beside the label rather
                  // than above it, which is MUI's own default and stands the strip at 72px.
                  icon={<Icon />}
                  iconPosition="start"
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
        {/* The bar's one action, and only while there is something to authorise: live, nothing here
            says so, since a page drawing this session's own data has already said it. The dot is
            what tells the two remaining states apart — stale is a full page nothing on it would
            otherwise mark as last visit's — and the strip below the bar carries the sentence.

            Dimmed rather than absent while the scripts land, so the key does not appear under a
            thumb already on its way to the search beside it. */}
        {authState !== "live" && (
          <>
            {/* No hover label of any kind, native or MUI's: a word that appears only under a
                pointer is not there for the finger this bar is mostly read with, and the key's
                own `aria-label` is what a screen reader says either way. From `md` on a mouse the
                worded form of the same control stands beside it and spells the state out. */}
            <Badge
              color="secondary"
              variant="dot"
              overlap="circular"
              invisible={authState !== "stale"}
              sx={KEY_ICON_SX}
            >
              <IconButton
                color="inherit"
                aria-label="Authorise"
                disabled={authState === "authorising"}
                onClick={authorise}
                sx={{ ...BAR_BUTTON_SX, ...DISABLED_BUTTON_SX }}
              >
                <Key />
              </IconButton>
            </Badge>
            <Badge
              color="secondary"
              variant="dot"
              invisible={authState !== "stale"}
              sx={KEY_WORD_SX}
            >
              <Button
                color="inherit"
                startIcon={<Key />}
                disabled={authState === "authorising"}
                onClick={authorise}
                sx={BAR_WORD_SX}
              >
                {authState === "authorising" ? "Authorising" : "Authorise"}
              </Button>
            </Badge>
          </>
        )}
        {/* At every width: below `sm` the bar is a wordmark, this and the ⋮, the tabs having gone to
            the bottom of the screen, so the box stands in the space the strip left. A button rather
            than a `BarAction`, which is text-only and, under a finger, a menu item — a search box
            two taps away is one nobody opens. ⌘K and `/` reach the same palette (`app/Search`). */}
        <IconButton
          color="inherit"
          aria-label="Search"
          aria-keyshortcuts="Meta+K Control+K /"
          onClick={openSearch}
          sx={BAR_BUTTON_SX}
        >
          <Search />
        </IconButton>
        {/* The bar's last child at every width and pointer, which is what `edge="end"` states: it
            pulls the button into the bar's own gutter so the glyph lines up with the page edge
            below, and two buttons wearing it would overlap. */}
        <IconButton
          color="inherit"
          edge="end"
          aria-label="More"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={BAR_BUTTON_SX}
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
              onClick={() => {
                closeMenu();
                action.onClick?.();
              }}
            >
              {action.label}
            </MenuItem>
          ))}
          {actions.length > 0 && <Divider />}
          {/* Both directions, and at every width and pointer, because this item is the only handle
              on the mode that everyone has: the long press that turns it on is the pointer's alone,
              so a finger has no way in and a mouse no way out but a reload. Below the rule because
              it is a mode and not an errand — the two above act on the session's data. */}
          <MenuItem
            onClick={() => {
              closeMenu();
              setGuestMode(!guestMode);
            }}
          >
            {guestMode ? "Leave guest mode" : "Guest mode"}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
