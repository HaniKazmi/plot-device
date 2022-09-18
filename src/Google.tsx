import { Container } from "@mui/material";
import { lazy, ReactNode, Suspense, useEffect, useState } from "react";
import NavBar from "./NavBar";

const GamesGraphs = lazy(() => import(/* webpackPrefetch: true */ "./vg"));
const ShowsGraph = lazy(() => import(/* webpackPrefetch: true */ "./vg/Show"));

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID!;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY!;
const DISCOVERY_DOCS = "https://sheets.googleapis.com/$discovery/rest?version=v4";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const storage = sessionStorage;
const storageKey = "gapi-token";

type Token = google.accounts.oauth2.TokenResponse;
type TokenClient = google.accounts.oauth2.TokenClient;

const GoogleAuth = ({ children }: { children?: ReactNode }) => {
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
      />
      {gapiReady && children}
    </>
  );
};

let loadGapi = (isReady: (b: boolean) => void, token?: Token) => {
  loadGapi = () => { };
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
  loadG = () => { };
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

const Graphs = () => (
  <GoogleAuth>
    <Container>
      <Suspense>
        <GamesGraphs />
        <ShowsGraph />
      </Suspense>
    </Container>
  </GoogleAuth>
);

export default Graphs;
