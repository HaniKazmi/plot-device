import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { useCallback, useEffect, useReducer, useRef } from "react";
import NavBar from "./NavBar";
import { Outlet, useMatches } from "react-router-dom";
import { loadApis, reducer, registerDispatch, revokeApis } from "./utils/googleUtils";
import type { Tab } from "./tabs.ts";
import type {} from "@mui/material/themeCssVarsAugmentation";

const GoogleAuth = () => {
  const [{ apiReady, tokenClient }, dispatch] = useReducer(reducer, {});
  const setGuestMode = useRef((_: boolean) => {});
  const setGuestModeSetter = useCallback((func: (b: boolean) => void) => (setGuestMode.current = func), []);

  useEffect(() => {
    registerDispatch(dispatch);
    loadApis();
  }, []);

  return (
    <>
      <NavBar
        authorise={!apiReady && tokenClient && (() => tokenClient.requestAccessToken())}
        revoke={apiReady && revokeApis}
        setGuestMode={setGuestMode}
      />
      <Container maxWidth={"xl"}>
        <Outlet context={{ apiReady, setGuestModeSetter }} />
      </Container>
    </>
  );
};

const Graphs = () => {
  const matches = useMatches();
  const currTab: Tab = (matches.find((match) => Boolean(match.handle))!.handle as { tab: Tab }).tab;
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
