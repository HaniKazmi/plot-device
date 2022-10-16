import { AppBar, Box, Button, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import { Score } from '@mui/icons-material';


const NavBar = ({ authorise, revoke, tab, setTab }: { authorise: false | (() => void); revoke: false | (() => void), tab: string, setTab: (s: string) => void }) => {
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
          <Tabs textColor="inherit" value={tab} onChange={(_, value) => setTab(value)}>
            <Tab label="Games" value="games" />
            <Tab label="Shows" value="shows" />
          </Tabs>
        </Box>
        {!authorise && !revoke && "Authorising"}
        {authorise && (
          <Button color="inherit" onClick={authorise}>
            Authorise
          </Button>
        )}
        {revoke && (
          <>
            <Button color="inherit" target="_blank" href="https://docs.google.com/spreadsheets/d/1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk">
              Open Sheet
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
