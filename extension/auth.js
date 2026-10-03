// The app's own OAuth client. A client ID is public by design — the deployed bundle carries this
// same value — and the client lists this extension's redirect, chrome.identity.getRedirectURL().
const CLIENT_ID = "354295298450-sk6hsgh661q1our9cgk3o8phssj4ja8c.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";
const CACHE_KEY = "token";

// A minute short of the stated lifetime, so a token is never handed out to expire mid-upload.
const EXPIRY_MARGIN_MS = 60_000;

const authUrl = (interactive) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "token",
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: SCOPE,
  });
  // Without a prompt Google answers a returning user silently, which is what the non-interactive
  // attempt relies on; with several accounts signed in it needs the chooser and so fails over.
  if (interactive) params.set("prompt", "select_account");
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const requestToken = async (interactive) => {
  const redirect = await chrome.identity.launchWebAuthFlow({ url: authUrl(interactive), interactive });
  const fragment = new URLSearchParams(new URL(redirect).hash.slice(1));
  const token = fragment.get("access_token");
  if (!token) throw new Error(fragment.get("error") ?? "Google returned no token");
  const expiry = Date.now() + Number(fragment.get("expires_in")) * 1000 - EXPIRY_MARGIN_MS;
  await chrome.storage.session.set({ [CACHE_KEY]: { token, expiry } });
  return token;
};

// `chooseAccount` skips the silent attempt, which would hand back the account already signed in.
export const getToken = async ({ chooseAccount = false } = {}) => {
  const { [CACHE_KEY]: cached } = await chrome.storage.session.get(CACHE_KEY);
  if (!chooseAccount && cached && cached.expiry > Date.now()) return cached.token;
  if (chooseAccount) return requestToken(true);
  try {
    return await requestToken(false);
  } catch {
    return requestToken(true);
  }
};

export const dropToken = () => chrome.storage.session.remove(CACHE_KEY);
