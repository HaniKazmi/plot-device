import { AppBar, Button, Toolbar, Typography } from "@mui/material";

const NavBar = ({ authorise, revoke }: { authorise: false | (() => void); revoke: false | (() => void) }) => {
  return (
    <AppBar position="static" sx={{ marginBottom: (theme) => theme.spacing(2) }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Video Games
        </Typography>
        {!authorise && !revoke && "Authorising"}
        {authorise && (
          <Button color="inherit" onClick={authorise}>
            Authorise
          </Button>
        )}
        {revoke && (
          <Button color="inherit" onClick={revoke}>
            Revoke
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
