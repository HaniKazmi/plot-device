import { Container, createTheme, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { ReactNode, useEffect, useMemo, useReducer } from "react";
import NavBar from "./NavBar";
import { Outlet, useMatches } from "react-router-dom";
import { arrayToJson } from "./utils/arrayUtils";
import { Tab } from "./tabs";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID!;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY!;
const DISCOVERY_DOCS = "https://sheets.googleapis.com/$discovery/rest?version=v4";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const storage = sessionStorage;
const storageKey = "gapi-token";

type Token = google.accounts.oauth2.TokenResponse;
type TokenClient = google.accounts.oauth2.TokenClient;

type State = { tokenSet?: boolean; apiReady?: boolean; apiLoaded?: boolean; tokenClient?: TokenClient };

type Action =
  | { type: "tokenAcquired" }
  | { type: "tokenRevoked" }
  | { type: "apiLoaded" }
  | { type: "authLoaded"; client: TokenClient }
  | { type: "authExpired" };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "tokenAcquired":
      return {
        ...state,
        tokenSet: true,
        apiReady: state.apiLoaded,
      };
    case "tokenRevoked":
      return {
        ...state,
        tokenSet: false,
        apiReady: false,
      };
    case "apiLoaded":
      return {
        ...state,
        apiLoaded: true,
        apiReady: state.tokenSet,
      };
    case "authLoaded":
      return {
        ...state,
        tokenClient: action.client,
      };
    case "authExpired":
      return {
        ...state,
        tokenSet: false,
        apiReady: false,
      };
  }
};

let authDispatch: React.Dispatch<Action>;

const GoogleAuth = ({ children }: { children?: ReactNode }) => {
  const [{ apiReady, tokenClient }, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    authDispatch ??= dispatch;
    const tokenWrapper = JSON.parse(storage.getItem(storageKey)!);
    if (tokenWrapper?.expiry > Date.now()) {
      dispatch({ type: "tokenAcquired" });
    } else {
      loadG();
    }
    loadGapi(tokenWrapper?.token);
  }, []);

  return (
    <>
      <NavBar
        authorise={!apiReady && tokenClient && (() => tokenClient.requestAccessToken())}
        revoke={
          apiReady &&
          (() => {
            storage.removeItem(storageKey);
            dispatch({ type: "tokenRevoked" });
            loadG();
          })
        }
      />
      {apiReady && children}
    </>
  );
};

let loadGapi = (token?: Token) => {
  loadGapi = () => { if ( typeof gapi !== 'undefined')       authDispatch({ type: "apiLoaded" });};
  const script = document.createElement("script");
  script.src = "https://apis.google.com/js/api.js";
  script.onload = () => {
    gapi.load("client", async () => {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOCS],
      });
      if (token) {
        gapi.client.setToken(token);
      }
      authDispatch({ type: "apiLoaded" });
    });
  };
  document.body.appendChild(script);
};

let loadG = () => {
  loadG = () => {};
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.onload = () => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (token) => {
        const expiry = Date.now() + parseInt(token.expires_in) * 1000;
        storage.setItem(storageKey, JSON.stringify({ token, expiry }));
        authDispatch({ type: "tokenAcquired" });
      },
      prompt: "",
    });

    authDispatch({ type: "authLoaded", client: tokenClient });
  };
  document.body.appendChild(script);
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

export const fetchAndConvertSheet = <T,>(
  { spreadsheetId, range }: Tab,
  jsonConverter: (array: Record<string, string>[]) => T,
  setData: (json: T) => void
) => {
  gapi.client.sheets.spreadsheets.values
    .get({ spreadsheetId, range })
    .then((response) => response.result.values!)
    .then(arrayToJson)
    .then(jsonConverter)
    .then(setData)
    .catch((error) => {
      console.log(error);
      authDispatch({ type: "authExpired" });
      loadG();
    });
};

const getTheme = (prefersDarkMode: boolean, tab: Tab) => {
  const { palette } = createTheme();
  return createTheme({
    palette: {
      mode: prefersDarkMode ? "dark" : "light",
      primary: {
        main: tab.id === "show" ? "#df2020" : palette.primary.main,
      },
      secondary: {
        main: tab.id === "show" ? "#20dfdf" : palette.secondary.main,
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
