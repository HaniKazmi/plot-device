export type Token = google.accounts.oauth2.TokenResponse;

export interface TokenWrapper {
  expiry: number;
  token: Token;
}

/**
 * Reads a stored token wrapper, treating anything unreadable as absent.
 *
 * The parse is guarded because the caller runs inside a `useState` initialiser: a throw there
 * happens during render, which takes the whole page down rather than just prompting to
 * authorise again.
 */
export const parseTokenWrapper = (raw: string | null): TokenWrapper | null => {
  try {
    return JSON.parse(raw || "null") as TokenWrapper | null;
  } catch {
    return null;
  }
};

/** Whether a stored token is still usable at `now`. Expiry is an absolute epoch time. */
export const isTokenValid = (wrapper: TokenWrapper | null, now: number) => !!wrapper && wrapper.expiry > now;

/**
 * Whether a token client response carries a grant rather than a refusal.
 *
 * GIS delivers a refusal — a dismissed consent popup, `access_denied`, a scope the user declined —
 * to the very callback a grant arrives on, as a response with `error` set and no `access_token`.
 * Storing one wraps it with a `NaN` expiry and hands `gapi.client.setToken` an object holding no
 * credential, so the app reports itself authorised and every sheet request then fails as though
 * the spreadsheet were unreachable.
 */
export const isGrant = (token: Token) => !token.error && !!token.access_token;

/**
 * The absolute time a token issued at `now` stops being valid.
 *
 * `expires_in` arrives from Google as a string of seconds. A value that does not parse yields
 * `NaN`, which stores without complaint and then fails every `isTokenValid` comparison — the
 * token is discarded on the next read rather than at the point it was issued.
 */
export const expiryFor = (token: Token, now: number) => now + parseInt(token.expires_in) * 1000;
