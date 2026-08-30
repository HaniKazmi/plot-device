/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Tab } from "../tabs.ts";
import { arrayToJson } from "../utils/arrayUtils.ts";
import { expiryFor, isTokenValid, parseTokenWrapper, type Token, type TokenWrapper } from "./token.ts";

export const gapi_script = "https://apis.google.com/js/api.js";
export const g_script = "https://accounts.google.com/gsi/client";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOCS = "https://sheets.googleapis.com/$discovery/rest?version=v4";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

// Resolved per call rather than at module load. Reading the global here would make merely
// importing this module fail anywhere it does not exist, which is every non-browser context.
const storage = () => sessionStorage;
const storageKey = "gapi-token";

type TokenClient = google.accounts.oauth2.TokenClient;

const isGsiReady = () => typeof google !== "undefined" && !!google.accounts;
const isGapiReady = () => typeof gapi !== "undefined";

const getValidToken = (): Token | undefined => {
  const wrapper = parseTokenWrapper(storage().getItem(storageKey));
  if (isTokenValid(wrapper, Date.now())) return wrapper!.token;
  storage().removeItem(storageKey);
  return undefined;
};

const appendScript = (src: string) => {
  const script = document.createElement("script");
  script.src = src;
  document.body.appendChild(script);
  return script;
};

const useScript = (src: string, isReady: () => boolean) => {
  const [loaded, setLoaded] = useState(isReady);

  useEffect(() => {
    if (loaded) return;

    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing && isReady()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(true);
      return;
    }

    const script = existing ?? appendScript(src);
    const handleLoad = () => setLoaded(true);
    script.addEventListener("load", handleLoad);
    return () => script.removeEventListener("load", handleLoad);
  }, [src, loaded, isReady]);

  return loaded;
};

interface GoogleAuthContextType {
  apiReady: boolean;
  authorise?: () => void;
  revoke?: () => void;
  fetchAndConvertSheet: <T>(tab: Tab, jsonConverter: (array: Record<string, string>[]) => T) => Promise<T>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

export const GoogleAuthProvider = ({ children }: { children: ReactNode }) => {
  const [tokenSet, setTokenSet] = useState(() => !!getValidToken());
  const [apiReadyToFetch, setApiReadyToFetch] = useState(false);
  const [tokenClient, setTokenClient] = useState<TokenClient>();

  const gsiLoaded = useScript(g_script, isGsiReady);
  const gapiScriptLoaded = useScript(gapi_script, isGapiReady);

  const apiReady = tokenSet && apiReadyToFetch;

  useEffect(() => {
    if (!gsiLoaded) return;
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (token) => {
        const expiry = expiryFor(token, Date.now());
        storage().setItem(storageKey, JSON.stringify({ token, expiry } satisfies TokenWrapper));
        setTokenSet(true);
        if (typeof gapi !== "undefined" && gapi.client) {
          gapi.client.setToken(token);
        }
      },
      prompt: "",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenClient(client);
  }, [gsiLoaded]);

  useEffect(() => {
    if (!gapiScriptLoaded) return;
    gapi.load("client", async () => {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOCS],
      });
      const initialToken = getValidToken();
      if (initialToken) {
        gapi.client.setToken(initialToken);
      }
      setApiReadyToFetch(true);
    });
  }, [gapiScriptLoaded]);

  const authorise = !tokenSet && tokenClient ? () => tokenClient.requestAccessToken() : undefined;

  const revoke = apiReady
    ? () => {
        storage().removeItem(storageKey);
        setTokenSet(false);
      }
    : undefined;

  const fetchAndConvertSheet = async <T,>(
    { spreadsheetId, range }: Tab,
    jsonConverter: (array: Record<string, string>[]) => T,
  ): Promise<T> => {
    // Only the request is guarded. A converter throw means the sheet holds something it should
    // not, and clearing the token for that turns a data fault into an apparent auth fault: the
    // NavBar falls back to "Authorise", every other tab loses its session too, and authorising
    // again refetches the same bad cell and clears it again, with nothing on screen to say why.
    let response;
    try {
      response = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
    } catch (error) {
      console.error(error);
      setTokenSet(false);
      throw error;
    }

    return jsonConverter(arrayToJson(response.result.values!));
  };

  return (
    <GoogleAuthContext.Provider value={{ apiReady, authorise, revoke, fetchAndConvertSheet }}>
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
  }
  return context;
};
