import { Tab } from "../tabs.ts";
import { arrayToJson } from "./arrayUtils.ts";
import { Dispatch } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOCS = "https://sheets.googleapis.com/$discovery/rest?version=v4";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const storage = sessionStorage;
const storageKey = "gapi-token";

type Token = google.accounts.oauth2.TokenResponse;
type TokenClient = google.accounts.oauth2.TokenClient;
interface TokenWrapper {
  expiry: number;
  token: Token;
}

interface State {
  tokenSet?: boolean;
  apiReady?: boolean;
  apiLoaded?: boolean;
  tokenClient?: TokenClient;
}

type Action =
  | { type: "tokenAcquired" }
  | { type: "tokenRevoked" }
  | { type: "apiLoaded" }
  | { type: "authLoaded"; client: TokenClient }
  | { type: "authExpired" };

let authDispatch: Dispatch<Action>;

export const registerDispatch = (dispatch: Dispatch<Action>) => (authDispatch ??= dispatch);

export const reducer = (state: State, action: Action): State => {
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

export const fetchAndConvertSheet = <T>(
  { spreadsheetId, range }: Tab,
  jsonConverter: (array: Record<string, string>[]) => T,
  setData: (json: T) => void,
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

export const loadApis = () => {
  const tokenWrapper = JSON.parse(storage.getItem(storageKey)!) as TokenWrapper | undefined;
  if (!tokenWrapper || tokenWrapper.expiry > Date.now()) {
    authDispatch({ type: "tokenAcquired" });
  } else {
    loadG();
  }
  loadGapi(tokenWrapper?.token);
};

export const revokeApis = () => {
  storage.removeItem(storageKey);
  authDispatch({ type: "tokenRevoked" });
  loadG();
};

let loadGapi = (token?: Token) => {
  loadGapi = () => {
    if (typeof gapi !== "undefined") authDispatch({ type: "apiLoaded" });
  };
  const script = document.createElement("script");
  script.src = "https://apis.google.com/js/api.js";
  script.onload = () => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  loadG = () => {};
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.onload = () => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (token) => {
        const expiry = Date.now() + parseInt(token.expires_in) * 1000;
        const value: TokenWrapper = { token, expiry };
        storage.setItem(storageKey, JSON.stringify(value));
        authDispatch({ type: "tokenAcquired" });
      },
      prompt: "",
    });

    authDispatch({ type: "authLoaded", client: tokenClient });
  };
  document.body.appendChild(script);
};
