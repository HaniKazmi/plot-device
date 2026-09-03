import { AppBar, Box, Button, Tab as MuiTab, Tabs as MuiTabs, Toolbar, Typography } from "@mui/material";
import { Score } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Tabs, { useCurrentTab } from "./tabs";
import useLongPress from "./utils/useLongPress";
import { useGoogleAuth } from "./contexts/GoogleAuthContext";

const NavBar = ({ setGuestMode }: { setGuestMode: (value: boolean) => void }) => {
  const navigate = useNavigate();
  const currTab = useCurrentTab();
  const events = useLongPress(() => setGuestMode(true));
  const { authorise, revoke } = useGoogleAuth();
  // A tab with no `darkBar` (none currently exist) keeps the plain dark bar `Google.tsx` falls
  // back to, so nothing here draws a rule or an ink colour with nothing to derive them from.
  const darkBar = currTab.darkBar;

  const toolbar = (
    <>
      {/* Only where the tab has a sheet of its own. A tab composing several has no single one to
          open, and the button would otherwise link to `/d/undefined`. */}
      {currTab.spreadsheetId && (
        <Button
          color="inherit"
          target="_blank"
          href={`https://docs.google.com/spreadsheets/d/${currTab.spreadsheetId}`}
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
        // apart at a glance. `applyStyles` rather than `theme.palette.mode`, which reads the
        // light scheme's literal under `cssVariables: true` regardless of which paper is on
        // screen (AGENTS.md).
        ...(darkBar && theme.applyStyles("dark", { borderBottom: `3px solid ${darkBar.rule}` })),
      })}
      {...events}
    >
      <Toolbar>
        <Score sx={{ display: "flex", mr: 1 }} />
        {/* `cursive` is a generic family, so the wordmark resolves to Snell Roundhand on macOS and
            to something else on every other platform — the one piece of the page whose shape is
            decided by the reader's OS. Weight and tracking give it the same treatment the index at
            hani.fyi and the status page use, which `system-ui` renders identically everywhere.

            Shown at every width: at this size it costs the tabs about six characters, where the h6
            it replaces cost enough to be worth hiding on a phone. */}
        <Typography
          noWrap
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
            other way there, since the strip hides its scrollbar. */}
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
        <Box sx={{ display: { xs: "none", md: "initial" } }}>{toolbar}</Box>
      </Toolbar>
      <Toolbar sx={{ display: { xs: "flex", md: "none" }, minHeight: 0, justifyContent: "flex-end" }}>
        {toolbar}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
