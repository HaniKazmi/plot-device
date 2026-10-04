/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { preload } from "react-dom";
// A type import and not a plain one: `tabs.ts` imports the five entry components eagerly and each
// reaches the medium registry, so evaluating it from here — which every `module.ts` reaches through
// `useData` — would build the registry from inside `tabs.ts`'s own temporal dead zone. Only the
// statement form is erased per file, which is what a bundler transpiling one file at a time reads.
import type { SheetTab } from "../tabs.ts";
import { arrayToJson } from "../utils/arrayUtils.ts";
import { isGrant, parseSession, type Session } from "./token.ts";

const g_script = "https://accounts.google.com/gsi/client";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SHEETS_URL = import.meta.env.VITE_SHEETS_URL;

/**
 * Google is asked who the reader is and nothing more. The sheets are read by the function's own
 * service account, so the token this grant returns is spent once, on `/session`, and never sent to
 * the Sheets API.
 */
const SCOPE = "openid email";

// Resolved per call rather than at module load. Reading the global here would make merely
// importing this module fail anywhere it does not exist, which is every non-browser context.
// `localStorage` and not `sessionStorage`: a session lasts a month, and held per tab it would be
// asked for again in every tab and after every restart of an installed app.
const storage = () => localStorage;
const storageKey = "sheets-session";

type TokenClient = google.accounts.oauth2.TokenClient;

const isGsiReady = () => typeof google !== "undefined" && !!google.accounts;

const getValidSession = (): Session | undefined => {
  const session = parseSession(storage().getItem(storageKey));
  if (session && session.expiresAt > Date.now()) return session;
  storage().removeItem(storageKey);
  return undefined;
};

/** What a read reports where the function has turned the session away, or there is none to send. */
const EXPIRED = "Authorisation has expired, so the sheets were not read: press the key to authorise again.";

const appendScript = (src: string) => {
  const script = document.createElement("script");
  script.src = src;
  document.body.appendChild(script);
  return script;
};

/**
 * Loads a script once `wanted` turns true, and reports whether it has loaded. A script asked for and
 * then not wanted is left in the page, since a tag cannot be unloaded and the next want reuses it.
 */
const useScript = (src: string, isReady: () => boolean, wanted: boolean) => {
  const [loaded, setLoaded] = useState(isReady);

  useEffect(() => {
    if (loaded || !wanted) return;

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
  }, [src, loaded, isReady, wanted]);

  return loaded;
};

interface GoogleAuthContextType {
  signedIn: boolean;
  authorise?: () => void;
  signOut?: () => void;
  fetchAndConvertSheet: <T>(tab: SheetTab, jsonConverter: (array: Record<string, string>[]) => T) => Promise<T>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

/**
 * Trades a Google grant for the function's own session. Google's token lasts an hour and a page
 * cannot renew it without a popup, which a browser blocks unless it follows a click; the session
 * lasts as long as the function's deployment says, so the key is pressed once a month rather than
 * once an hour.
 */
const openSession = async (accessToken: string): Promise<Session> =>
  readBody<Session>(
    await fetch(`${SHEETS_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    }),
  );

/**
 * The function's answer, or its own words on why not: every failure it reports carries an `error`
 * naming the fault — a renamed tab, a lost share, an account off the list.
 */
const readBody = async <T,>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(body?.error ?? `The sheets function answered ${response.status}`);
  return body as T;
};

/**
 * One request per range, the four running concurrently. A single batch of the four measures slower
 * on this data, not faster — a median of 598 ms against 369 ms for the four in parallel, with the
 * first grid landing at 308 ms (2026-09-11) — and it fails all four media together whenever one
 * range is renamed. The function reads the range with its own service account and answers its rows.
 */
const fetchRange = (spreadsheetId: string, range: string, token: string) =>
  fetch(`${SHEETS_URL}/values?${new URLSearchParams({ spreadsheetId, range })}`, {
    // Not `Authorization`: Cloud Run reads a bearer token there as a Google credential and refuses
    // it before the function runs.
    headers: { "X-Plot-Session": token },
  });

export const GoogleAuthProvider = ({ children }: { children: ReactNode }) => {
  const [signedIn, setSignedIn] = useState(() => !!getValidSession());
  const [tokenClient, setTokenClient] = useState<TokenClient>();

  // Google's script does one thing here, open the Authorise popup, so a visit that already holds a
  // session downloads none of it. It cannot wait for the press instead: a browser allows a popup only
  // straight after a click, and a script fetched in between spends that allowance.
  if (!signedIn) preload(g_script, { as: "script" });
  const gsiLoaded = useScript(g_script, isGsiReady, !signedIn);

  useEffect(() => {
    if (!gsiLoaded) return;
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (grant) => {
        // A refusal reaches this callback too, and nothing about it is worth keeping: leaving
        // `signedIn` false is what holds the NavBar on "Authorise", which is the one control that
        // can get the reader out of it.
        if (!isGrant(grant)) {
          console.error("Authorisation not granted:", grant.error, grant.error_description);
          return;
        }

        openSession(grant.access_token)
          .then((session) => {
            storage().setItem(storageKey, JSON.stringify(session));
            setSignedIn(true);
          })
          // An account off the function's list lands here, as does a function that cannot be
          // reached. Either way the key stays in the bar, which is the state that is true.
          .catch((error: unknown) => console.error("The sheets function did not open a session:", error));
      },
      prompt: "",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenClient(client);
  }, [gsiLoaded]);

  /**
   * Another tab of the app authorising or signing out, which shares this one's storage and so its
   * session. A session that lapses while the page is open needs no watching: the next read is
   * refused with a 401, which ends it and says which control to press.
   */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setSignedIn(!!getValidSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const endSession = () => {
    storage().removeItem(storageKey);
    setSignedIn(false);
  };

  const authorise = !signedIn && tokenClient ? () => tokenClient.requestAccessToken() : undefined;

  const signOut = signedIn ? endSession : undefined;

  const fetchAndConvertSheet = async <T,>(
    { spreadsheetId, range }: SheetTab,
    jsonConverter: (array: Record<string, string>[]) => T,
  ): Promise<T> => {
    // Only the request is guarded. A converter throw means the sheet holds something it should
    // not, and clearing the session for that turns a data fault into an apparent auth fault: the
    // NavBar falls back to "Authorise", every other tab loses its session too, and authorising
    // again refetches the same bad cell and clears it again, with nothing on screen to say why.
    // Nothing about the session is checked here: the function refuses an expired, forged or absent
    // one with the same 401, and that refusal is what ends it below.
    const token = parseSession(storage().getItem(storageKey))?.token ?? "";

    let response;
    try {
      response = await fetchRange(spreadsheetId, range, token);
    } catch (error) {
      // A request that never reached the function — a phone between networks — leaves the session
      // standing and the rows on screen the reader's own.
      console.error(error);
      throw new Error("The sheets could not be reached: check the connection and refresh.", { cause: error });
    }

    // A 401 is the function refusing the session and nothing else, so it alone ends it, stated in
    // the app's own words, which name the control to press. Every other failure is a fault with the
    // sheet — a renamed tab, an emptied one, a lost share — which signing in again would not change.
    if (response.status === 401) {
      endSession();
      throw new Error(EXPIRED);
    }
    const { values } = await readBody<{ values: string[][] }>(response);
    return jsonConverter(arrayToJson(values));
  };

  return (
    <GoogleAuthContext.Provider value={{ signedIn, authorise, signOut, fetchAndConvertSheet }}>
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
