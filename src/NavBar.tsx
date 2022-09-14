import { AppBar, Button, Toolbar, Typography } from "@mui/material";
import Goth from 'gothic'
import { useEffect } from "react";

const NavBar = ({ auth: render }: { auth: boolean | undefined }) => {
    useEffect(() => {
        if (render === false) {
            Goth.button('signin', { type: 'standard', size: 'large', text: 'signup_with' })
        }
    }, [render])

    return (
        <AppBar position='static' sx={{ marginBottom: (theme) => theme.spacing(2) }}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Video Games
                </Typography>
                {render === undefined && "Signing In" }
                {render === false && <div id="signin" />}
                {render && <Button color="inherit" onClick={Goth.signout}>Sign Out</Button>}
            </Toolbar>
        </AppBar>
    )
};

export default NavBar;