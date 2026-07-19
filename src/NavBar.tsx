import { AppBar, Box, Button, Tab as MuiTab, Tabs as MuiTabs, Toolbar, Typography } from "@mui/material";
import { Score } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import Tabs, { Tab } from "./tabs";
import useLongPress from "./utils/useLongPress";
import { useGoogleAuth } from "./contexts/GoogleAuthContext";

const NavBar = ({ setGuestMode }: { setGuestMode: (value: boolean) => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.replace(/^\//, ""); // remove leading slash
  const currTab: Tab = Tabs.find((t) => t.id === path) || Tabs[0];
  const events = useLongPress(() => setGuestMode(true));
  const { authorise, revoke } = useGoogleAuth();

  const toolbar = (
    <>
      <Button
        color="inherit"
        target="_blank"
        href={`https://docs.google.com/spreadsheets/d/${currTab.spreadsheetId}`}
      >
        Sheet
      </Button>
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
    <>
      <AppBar
        position="static"
        sx={{ marginBottom: (theme) => theme.spacing(2) }}
        {...events}
      >
        <Toolbar>
          <Score sx={{ display: "flex", mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            sx={{
              mr: 2,
              fontFamily: "cursive",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
              display: { xs: "none", md: "block" },
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
    </>
  );
};

export default NavBar;
