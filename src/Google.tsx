import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { useState } from "react";
import NavBar from "./NavBar";
import { Outlet } from "react-router-dom";
import { GoogleAuthProvider } from "./contexts/GoogleAuthContext.tsx";
import { useCurrentTab } from "./tabs.ts";
import type { Tab } from "./tabs.ts";
import type {} from "@mui/material/themeCssVarsAugmentation";

const GoogleAuth = () => {
  const [guestMode, setGuestMode] = useState(false);

  return (
    <GoogleAuthProvider>
      <NavBar setGuestMode={setGuestMode} />
      <Container maxWidth={"xl"}>
        <Outlet context={{ guestMode }} />
      </Container>
    </GoogleAuthProvider>
  );
};

const Graphs = () => {
  const currTab = useCurrentTab();
  const theme = getTheme(currTab);

  return (
    <ThemeProvider
      theme={theme}
      noSsr
    >
      <meta
        name="theme-color"
        content={theme.palette.primary.main}
        media="(prefers-color-scheme: light)"
      />
      <CssBaseline />
      <GoogleAuth />
    </ThemeProvider>
  );
};

const getTheme = (tab: Tab) => {
  const { palette } = createTheme();
  const primaryColour = tab.primaryColour ?? palette.primary.main;
  return createTheme({
    cssVariables: true,
    colorSchemes: {
      dark: true,
    },
    palette: {
      primary: {
        main: primaryColour,
      },
      secondary: {
        main: tab.secondaryColour ?? palette.secondary.main,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            "&:hover": {
              boxShadow: theme.shadows[4],
            },
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            "& .MuiChip-label:empty": { paddingLeft: 0 },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            textTransform: "capitalize",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            textTransform: "capitalize",
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          content: {
            alignSelf: "flex-start",
          },
          root: {
            paddingBottom: 4,
          },
        },
      },
    },
  });
};

export default Graphs;
