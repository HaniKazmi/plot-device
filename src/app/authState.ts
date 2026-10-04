import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import { MEDIA as MEDIA_ORDER, type Medium } from "../utils/types";
import { useLibrary } from "./library";

/**
 * What the reader can do about their data, as one word.
 *
 * - `authorising` — signed out and the sign-in script still loading, so nothing can be asked of
 *   Google yet.
 * - `live` — a session: the page can fetch, and is showing this session's own fetch once it lands.
 * - `stale` — a cached copy on screen and no session, so nothing will refresh it until someone asks.
 * - `empty` — no copy and no session: there is nothing to show at all.
 */
type AuthState = "live" | "authorising" | "stale" | "empty";

/**
 * The state from the two things that decide it: which of the auth callbacks exist, and whether any
 * library has a copy behind it.
 *
 * The callbacks are the session — `authorise` is offered only without one, once the sign-in script
 * has loaded, and `signOut` only with one — so neither present is the loading state and `signOut`
 * present is the live one, whatever the cache holds. Only then does the cache decide, and it decides
 * on presence alone: **whether a fetch of this session's own produced the copy is not part of the
 * question.** A reader who signs out mid-session, or a read the function refused, leaves rows on
 * screen that this session did fetch and can no longer refresh, which is exactly what the key's
 * dot is for — read off `loaded` instead, both cases would answer `empty` and blank a page that is
 * full.
 */
export const authStateOf = ({
  authorise,
  signOut,
  raw,
}: {
  authorise: (() => void) | undefined;
  signOut: (() => void) | undefined;
  raw: Partial<Record<Medium, readonly unknown[]>>;
}): AuthState => {
  if (!authorise && !signOut) return "authorising";
  if (signOut) return "live";
  return MEDIA_ORDER.some((medium) => !!raw[medium]) ? "stale" : "empty";
};

/**
 * The state, read where both halves of it are in scope.
 *
 * The auth context sits above the library provider and knows nothing about the cache, and the
 * library knows nothing about the session, so the one surface that can answer is a hook below both —
 * which the bar, the strip and the page body all are.
 */
export const useAuthState = (): AuthState => {
  const { authorise, signOut } = useGoogleAuth();
  const { raw } = useLibrary();
  return authStateOf({ authorise, signOut, raw });
};
