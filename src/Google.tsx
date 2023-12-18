import { Container, createTheme, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { ReactNode, useEffect, useMemo, useReducer } from "react";
import NavBar from "./NavBar";
import { Outlet, useMatches } from "react-router-dom";
import { Tab } from "./tabs";
import { loadApis, reducer, registerDispatch, revokeApis } from "./utils/googleUtils.ts";

const GoogleAuth = ({ children }: { children?: ReactNode }) => {
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
      {apiReady && children}
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
      <GoogleAuth>
        <Container maxWidth={"xl"}>
          <Outlet />
        </Container>
      </GoogleAuth>
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
    },
  });
};

export default Graphs;
