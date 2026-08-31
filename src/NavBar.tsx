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
      sx={{ marginBottom: (theme) => theme.spacing(2) }}
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
          sx={{
            mr: { xs: 1, md: 2 },
            fontSize: "0.875rem",
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          Plot Device
        </Typography>
        <Box sx={{ flexGrow: 1, display: "flex" }}>
          <MuiTabs
            textColor="inherit"
            indicatorColor="secondary"
            value={currTab.id}
            onChange={(_, value: string) => {
              navigate(value);
            }}
          >
            {Tabs.map((tab) => (
              <MuiTab
                key={`muitab-${tab.id}`}
                label={tab.name}
                value={tab.id}
              />
            ))}
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
