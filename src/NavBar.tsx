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
import { MoreVert, Score } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Tabs, { useCurrentTab } from "./tabs";
import useLongPress from "./utils/useLongPress";
import { useGoogleAuth } from "./contexts/GoogleAuthContext";

/**
 * The menu's own items are worded rather than keyed, and the theme capitalises every `MenuItem`
 * so that a bare model key reads as a word — which turns "Guest mode" into "Guest Mode". The
 * select boxes state the same override for the same reason.
 */
const MENU_ITEM_SX = { textTransform: "none" } as const;

const NavBar = ({ guestMode, setGuestMode }: { guestMode: boolean; setGuestMode: (value: boolean) => void }) => {
  const navigate = useNavigate();
  const currTab = useCurrentTab();
  // Only the pointer handlers: a long press is a mouse gesture here. On touch it collides with the
  // browser's own press-and-hold — selection, the callout menu — and the overflow menu offers guest
  // mode outright, so nothing is lost. Compatibility mouse events from a tap arrive as a down and
  // an up together at release, which schedules the timer and cancels it in the same tick.
  const { onMouseDown, onMouseUp, onMouseLeave } = useLongPress(() => setGuestMode(true));
  const { authorise, revoke } = useGoogleAuth();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  // A tab with no `darkBar` (none currently exist) keeps the plain dark bar `Google.tsx` falls
  // back to, so nothing here draws a rule or an ink colour with nothing to derive them from.
  const darkBar = currTab.darkBar;

  const sheetHref = `https://docs.google.com/spreadsheets/d/${currTab.spreadsheetId}`;
  const closeMenu = () => setMenuAnchor(null);

  const buttons = (
    <>
      {/* Only where the tab has a sheet of its own. A tab composing several has no single one to
          open, and the button would otherwise link to `/d/undefined`. */}
      {currTab.spreadsheetId && (
        <Button
          color="inherit"
          target="_blank"
          href={sheetHref}
        >
          Sheet
        </Button>
      )}
      {!authorise && !revoke && <Button color="inherit">Authorising</Button>}
      {authorise && (
        <Button
          color="inherit"
          onClick={authorise}
        >
          Authorise
        </Button>
      )}
      {revoke && (
        <Button
          color="inherit"
          onClick={revoke}
        >
          Revoke
        </Button>
      )}
    </>
  );

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
      <Toolbar>
        <Score sx={{ display: "flex", mr: 1 }} />
        {/* `cursive` is a generic family, so the wordmark resolves to Snell Roundhand on macOS and
            to something else on every other platform — the one piece of the page whose shape is
            decided by the reader's OS. Weight and tracking give it the same treatment the index at
            hani.fyi and the status page use, which `system-ui` renders identically everywhere.

            Shown at every width: at this size it costs the tabs about six characters, where the h6
            it replaces cost enough to be worth hiding on a phone. It also carries the long press
            that opens guest mode, which sat on the whole bar — a bar holding a tab strip and a
            menu button is three hundred pixels of surface where a press that misses its target
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
            color: "inherit",
            textDecoration: "none",
            // `color: inherit` reads the bar's own dark text otherwise (`Google.tsx`'s
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
            sx={{ display: { xs: "none", sm: "flex" }, minWidth: 0 }}
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
        <Box sx={{ display: { xs: "none", md: "flex" }, flexShrink: 0 }}>{buttons}</Box>
        <IconButton
          color="inherit"
          edge="end"
          aria-label="More"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={{ display: { xs: "flex", md: "none" }, flexShrink: 0 }}
        >
          <MoreVert />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={closeMenu}
        >
          {currTab.spreadsheetId && (
            <MenuItem
              component="a"
              target="_blank"
              href={sheetHref}
              onClick={closeMenu}
              sx={MENU_ITEM_SX}
            >
              Sheet
            </MenuItem>
          )}
          {!authorise && !revoke && (
            <MenuItem
              disabled
              sx={MENU_ITEM_SX}
            >
              Authorising
            </MenuItem>
          )}
          {authorise && (
            <MenuItem
              onClick={() => {
                closeMenu();
                authorise();
              }}
              sx={MENU_ITEM_SX}
            >
              Authorise
            </MenuItem>
          )}
          {revoke && (
            <MenuItem
              onClick={() => {
                closeMenu();
                revoke();
              }}
              sx={MENU_ITEM_SX}
            >
              Revoke
            </MenuItem>
          )}
          {/* Both directions, because the menu is the only handle a touch reader has on the mode:
              the long press that turns it on is a pointer gesture, and leaving it was a reload. */}
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
