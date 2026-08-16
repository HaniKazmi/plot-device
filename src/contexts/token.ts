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
 * The absolute time a token issued at `now` stops being valid.
 *
 * `expires_in` arrives from Google as a string of seconds. A value that does not parse yields
 * `NaN`, which stores without complaint and then fails every `isTokenValid` comparison — the
 * token is discarded on the next read rather than at the point it was issued.
 */
export const expiryFor = (token: Token, now: number) => now + parseInt(token.expires_in) * 1000;
