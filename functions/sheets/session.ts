import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The function's own credential: who signed in and until when, signed with `SESSION_SECRET`.
 *
 * Google's access and ID tokens both last an hour, and a page has no way to renew either without a
 * popup, which a browser blocks unless it follows a click. A token the function issues itself can
 * last as long as the deployment says, so a reader signs in with Google once a month per device
 * rather than once an hour. It is carried in a header, never a cookie, so it works across the app's
 * origin and the function's without either sitting under the other's domain.
 *
 * The format is `v1.<payload>.<signature>`, both base64url. Not a JWT: nothing else reads it, and a
 * JWT's header is a second place to say which algorithm checks it.
 */
export interface Session {
  email: string;
  /** Seconds since the epoch, as a JWT's `exp` is. */
  exp: number;
}

const VERSION = "v1";

const sign = (payload: string, secret: Buffer) => createHmac("sha256", secret).update(payload).digest("base64url");

export const issueSession = (email: string, nowSeconds: number, lifetimeSeconds: number, secret: Buffer) => {
  const session: Session = { email, exp: nowSeconds + lifetimeSeconds };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { token: `${VERSION}.${payload}.${sign(`${VERSION}.${payload}`, secret)}`, session };
};

/**
 * The session a token carries, or why there is none.
 *
 * The signature is compared in constant time, so a forger cannot learn it a byte at a time from how
 * long a refusal takes. Every refusal reaches the caller as a 401 with the same body; the reason is
 * for the log alone.
 */
export const verifySession = (
  token: string,
  nowSeconds: number,
  secret: Buffer,
): { session: Session } | { refused: string } => {
  const [version, payload, signature, ...rest] = token.split(".");
  if (version !== VERSION || !payload || !signature || rest.length > 0) return { refused: "malformed" };

  const expected = Buffer.from(sign(`${version}.${payload}`, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { refused: "bad signature" };

  let session: Session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { refused: "unreadable payload" };
  }
  if (typeof session?.email !== "string" || typeof session.exp !== "number") return { refused: "unreadable payload" };
  if (session.exp <= nowSeconds) return { refused: "expired" };
  return { session };
};

/**
 * The header a session travels in. Not `Authorization`: Cloud Run reads any bearer token there as a
 * Google credential and answers 401 itself, before the function runs, even on a service open to
 * all — so a session sent that way is refused by the platform and never reaches `verifySession`.
 */
export const SESSION_HEADER = "x-plot-session";
