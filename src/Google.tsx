import { Container, createTheme, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { useEffect, useMemo, useReducer } from "react";
import NavBar from "./NavBar";
import { Outlet, useMatches } from "react-router-dom";
import { loadApis, reducer, registerDispatch, revokeApis } from "./utils/googleUtils.ts";
import type { Tab } from "./tabs.ts";

const GoogleAuth = () => {
  const [{ apiReady, tokenClient }, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    registerDispatch(dispatch);
    loadApis();
  }, []);

  return (
    <>
      <NavBar
        authorise={!apiReady && tokenClient && (() => tokenClient.requestAccessToken())}
        revoke={apiReady && revokeApis}
      />
      <Container maxWidth={"xl"}>
        <Outlet context={{ apiReady }} />
      </Container>
    </>
  );
};

const Graphs = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const matches = useMatches();
  const currTab: Tab = (matches.find((match) => Boolean(match.handle))!.handle as { tab: Tab }).tab;
  const theme = useMemo(() => getTheme(prefersDarkMode, currTab), [prefersDarkMode, currTab]);

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.palette.primary.main);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GoogleAuth />
    </ThemeProvider>
  );
};

const getTheme = (prefersDarkMode: boolean, tab: Tab) => {
  const { palette } = createTheme();
  return createTheme({
    palette: {
      mode: prefersDarkMode ? "dark" : "light",
      primary: {
        main: tab.primaryColour ?? palette.primary.main,
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
