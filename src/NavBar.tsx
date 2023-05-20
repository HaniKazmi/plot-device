import { AppBar, Box, Button, Tab as MuiTab, Tabs as MuiTabs, Toolbar, Typography } from "@mui/material";
import { Score } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import Tabs, { Tab } from "./tabs";


const NavBar = ({ authorise, revoke, tab }: { authorise: false | (() => void); revoke: false | (() => void), tab?: Tab }) => {
  const navigate = useNavigate();
  return (
    <AppBar position="static" sx={{ marginBottom: (theme) => theme.spacing(2) }}>
      <Toolbar>
        <Score sx={{ display: "flex", mr: 1 }} />
        <Typography
          variant="h6"
          noWrap
          sx={{
            mr: 2,
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '.3rem',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          Plot Device
        </Typography>
        <Box sx={{ flexGrow: 1, display: "flex" }}>
          <MuiTabs textColor="inherit" value={tab || false} onChange={(_, value) => navigate(value.id)}>
            {Tabs.map(tab => <MuiTab key={`muitab-${tab.id}`} label={tab.name} value={tab} />)}
          </MuiTabs>
        </Box>
        {!authorise && !revoke && "Authorising"}
        {authorise && (
          <Button color="inherit" onClick={authorise}>
            Authorise
          </Button>
        )}
        {revoke && (
          <>
            <Button color="inherit" target="_blank" href={`https://docs.google.com/spreadsheets/d/${tab?.spreadsheetId}`}>
              Sheet
            </Button>
            <Button color="inherit" onClick={revoke}>
              Revoke
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
