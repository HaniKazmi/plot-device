import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

/**
 * What Google's `tokeninfo` endpoint answers for an access token, in the fields read here. Every
 * value arrives as a string, `email_verified` included.
 */
export interface TokenInfo {
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: string;
}

/**
 * The address a signed-in reader may be given a session for, or why not.
 *
 * The app signs in through the same popup it has always used, asking for `openid email` — a popup
 * the browser allows because it follows a click, where One Tap goes quiet for a cooling-off period
 * after one dismissal and leaves the app's key doing nothing. The access token that comes back is
 * sent here once and checked against Google rather than trusted: the audience has to be the app's
 * own client, or a token minted for any other app the reader has signed in to would pass, and the
 * address has to be verified and on the list. Expiry is not checked here: `tokeninfo` answers an
 * expired token with a 400, which `fetchTokenInfo` already reads as a refusal.
 */
export const admit = (
  info: TokenInfo,
  clientId: string,
  allowedEmails: ReadonlySet<string>,
): { email: string } | { refused: string } => {
  if (info.aud !== clientId && info.azp !== clientId) return { refused: "token issued to another client" };
  if (info.email_verified !== "true" || !info.email) return { refused: "no verified email on the token" };
  const email = info.email.toLowerCase();
  if (!allowedEmails.has(email)) return { refused: `${email} is not on the allowlist` };
  return { email };
};

export const fetchTokenInfo = async (accessToken: string): Promise<TokenInfo | undefined> => {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  // A token Google does not recognise answers 400. Anything not OK is a refusal, not an outage
  // worth reporting differently: the reader's remedy is to sign in again either way.
  if (!response.ok) return undefined;
  return (await response.json()) as TokenInfo;
};

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

/** Renewed this long before Google's stated expiry, so a read never leaves with a token mid-lapse. */
const EXPIRY_MARGIN_SECONDS = 60;

interface AccessToken {
  access_token: string;
  expires_in: number;
}

/** A token endpoint's answer, or its own words on why not. */
const readToken = async (response: Response, source: string): Promise<AccessToken> => {
  if (!response.ok) throw new Error(`${source} answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as AccessToken;
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

/**
 * A key file signs its own assertion and exchanges it, which is what a local run has. Deployed,
 * the function runs as the service account attached to it and the metadata server hands out its
 * tokens, so no key exists anywhere to leak.
 */
const keyFileToken = async (path: string) => {
  const key = JSON.parse(await readFile(path, "utf8")) as ServiceAccountKey;
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: key.client_email,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  return readToken(response, "token exchange");
};

/**
 * The metadata server mints the attached account's token at whatever scopes are asked for. Without
 * `scopes` it answers `cloud-platform`, which the Sheets API refuses.
 */
const metadataToken = async () => {
  const response = await fetch(
    `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=${SCOPE}`,
    { headers: { "Metadata-Flavor": "Google" } },
  );
  return readToken(response, "metadata server");
};

let cached: { token: Promise<string>; until: number } | undefined;

/**
 * One token per instance until it nears expiry, rather than an exchange per read. The promise is
 * what is held, so the app's four concurrent reads arriving at a cold instance share one fetch; a
 * fetch that fails is dropped, so the next read asks again rather than inheriting the failure.
 */
export const serviceAccountToken = (credentialsPath: string | undefined) => {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.until > now) return cached.token;
  const entry = {
    until: Number.POSITIVE_INFINITY,
    token: (credentialsPath ? keyFileToken(credentialsPath) : metadataToken()).then(
      ({ access_token, expires_in }) => {
        entry.until = now + expires_in - EXPIRY_MARGIN_SECONDS;
        return access_token;
      },
      (error: unknown) => {
        if (cached === entry) cached = undefined;
        throw error;
      },
    ),
  };
  cached = entry;
  return entry.token;
};

/**
 * One range, read with no render options. The default `FORMATTED_VALUE` is what makes every cell
 * the string the app's converters take; `UNFORMATTED_VALUE` hands back numbers for numeric cells and
 * breaks every converter at once.
 */
export const readRange = async (spreadsheetId: string, range: string, token: string) =>
  fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
