export type Grant = google.accounts.oauth2.TokenResponse;

/**
 * The sheets function's own credential, as the app stores it: the token it sends and the absolute
 * time the function stops accepting it. The function decides the lifetime and states the expiry,
 * so nothing here does arithmetic on it.
 */
export interface Session {
  token: string;
  expiresAt: number;
}

/**
 * Reads a stored session, treating anything unreadable or misshapen as absent.
 *
 * The parse is guarded because the caller runs inside a `useState` initialiser: a throw there
 * happens during render, which takes the whole page down rather than just prompting to authorise
 * again. The shape is checked as well, since the key may hold whatever an older build wrote there.
 */
export const parseSession = (raw: string | null): Session | null => {
  try {
    const parsed = JSON.parse(raw || "null") as Partial<Session> | null;
    return typeof parsed?.token === "string" && typeof parsed.expiresAt === "number" ? (parsed as Session) : null;
  } catch {
    return null;
  }
};

/**
 * Whether a token client response carries a grant rather than a refusal.
 *
 * GIS delivers a refusal — a dismissed consent popup, `access_denied`, a scope the user declined —
 * to the very callback a grant arrives on, as a response with `error` set and no `access_token`.
 * Sent on to the function, it is refused there with nothing on screen to say why.
 */
export const isGrant = (grant: Grant) => !grant.error && !!grant.access_token;
