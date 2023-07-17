import { Container, createTheme, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { ReactNode, useEffect, useMemo, useState } from "react";
import NavBar from "./NavBar";
import { Outlet, useOutletContext } from "react-router-dom";
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

const GoogleAuth = ({ tab, children }: { tab?: Tab; children?: ReactNode }) => {
  const [tokenClient, setTokenClient] = useState<TokenClient | false>(false);
  const [gapiLoaded, setGapiLoaded] = useState<boolean>(false);
  const [gapiReady, setGapiReady] = useState<boolean>(false);
  const [tokenSet, setTokenSet] = useState<boolean>(false);

  useEffect(() => {
    const tokenWrapper = JSON.parse(storage.getItem(storageKey)!);
    if (tokenWrapper?.expiry > Date.now()) {
      loadGapi(setGapiLoaded, tokenWrapper.token);
      setTokenSet(true);
    } else {
      loadG(setTokenClient, setTokenSet);
      loadGapi(setGapiLoaded);
    }

    if (gapiLoaded && tokenSet) setGapiReady(true);
    else setGapiReady(false);
  }, [gapiLoaded, tokenSet]);

  return (
    <>
      <NavBar
        authorise={!gapiReady && tokenClient !== false && (() => tokenClient.requestAccessToken())}
        revoke={
          gapiReady &&
          (() => {
            storage.removeItem(storageKey);
            setTokenSet(false);
          })
        }
        tab={tab}
      />
      {gapiReady && children}
    </>
  );
};

let loadGapi = (isReady: (b: boolean) => void, token?: Token) => {
  loadGapi = () => {};
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
      isReady(true);
    });
  };
  document.body.appendChild(script);
};

let loadG = (isReady: (b: TokenClient) => void, setTokenSet: (b: boolean) => void) => {
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
        setTokenSet(true);
      },
      prompt: "",
    });

    isReady(tokenClient);
  };
  document.body.appendChild(script);
};

const Graphs = () => {
  const [tab, setTab] = useState<Tab>();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => getTheme(prefersDarkMode), [prefersDarkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GoogleAuth tab={tab}>
        <Container maxWidth={"xl"}>
          <Outlet context={setTab} />
        </Container>
      </GoogleAuth>
    </ThemeProvider>
  );
};

export const useSetTab = () => useOutletContext<(tab: Tab) => void>();

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
    .then(setData);
};

const getTheme = (prefersDarkMode: boolean) =>
  createTheme({
    palette: {
      mode: prefersDarkMode ? "dark" : "light",
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

export default Graphs;
