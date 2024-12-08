import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import NavBar from "./NavBar";
import { Outlet, useMatches } from "react-router-dom";
import { loadApis, reducer, registerDispatch, revokeApis } from "./utils/googleUtils.ts";
import type { Tab } from "./tabs.ts";

const GoogleAuth = () => {
  const [{ apiReady, tokenClient }, dispatch] = useReducer(reducer, {});
  const setGuestMode = useRef((_: boolean) => {});
  const setGuestModeSetter = useCallback((func: (b: boolean) => void) => setGuestMode.current = func, [])

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
  const theme = useMemo(() => getTheme(currTab), [currTab]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GoogleAuth />
    </ThemeProvider>
  );
};

const getTheme = (tab: Tab) => {
  const { palette } = createTheme();
  const primaryColour = tab.primaryColour ?? palette.primary.main
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", primaryColour);
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
