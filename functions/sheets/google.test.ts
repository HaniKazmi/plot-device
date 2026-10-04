import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { admit, createTokenCache, type AccessToken, type TokenInfo } from "./google.ts";

const CLIENT = "client.apps.googleusercontent.com";
const ALLOWED = new Set(["reader@example.com"]);
const INFO: TokenInfo = {
  aud: CLIENT,
  azp: CLIENT,
  email: "Reader@Example.com",
  email_verified: "true",
};

describe("admit", () => {
  it("admits a verified address on the list, in lowercase, from a token issued to the app", () => {
    assert.deepEqual(admit(INFO, CLIENT, ALLOWED), { email: "reader@example.com" });
  });

  it("refuses a token issued to another app, which would otherwise pass for any signed-in reader", () => {
    const verdict = admit({ ...INFO, aud: "other.apps.googleusercontent.com", azp: "other" }, CLIENT, ALLOWED);

    assert.deepEqual(verdict, { refused: "token issued to another client" });
  });

  it("refuses an address that is unverified, absent or off the list", () => {
    assert.ok("refused" in admit({ ...INFO, email_verified: "false" }, CLIENT, ALLOWED));
    assert.ok("refused" in admit({ ...INFO, email: undefined }, CLIENT, ALLOWED));
    assert.ok("refused" in admit({ ...INFO, email: "someone@example.com" }, CLIENT, ALLOWED));
  });
});

describe("createTokenCache", () => {
  const fetcher = () => {
    const calls: { resolve: (token: AccessToken) => void; reject: (error: Error) => void }[] = [];
    const fetchToken = () =>
      new Promise<AccessToken>((resolve, reject) => {
        calls.push({ resolve, reject });
      });
    return { calls, fetchToken };
  };

  it("shares one fetch between reads arriving together, as the app's four do at a cold instance", async () => {
    const { calls, fetchToken } = fetcher();
    const token = createTokenCache(fetchToken, () => 1000);

    const reads = Promise.all([token(), token(), token(), token()]);
    calls[0].resolve({ access_token: "ya29.a", expires_in: 3600 });

    assert.deepEqual(await reads, ["ya29.a", "ya29.a", "ya29.a", "ya29.a"]);
    assert.equal(calls.length, 1);
  });

  it("fetches again a minute before Google's stated expiry, not after it", async () => {
    const { calls, fetchToken } = fetcher();
    let now = 1000;
    const token = createTokenCache(fetchToken, () => now);

    const first = token();
    calls[0].resolve({ access_token: "ya29.a", expires_in: 3600 });
    await first;

    now = 1000 + 3600 - 61;
    assert.equal(await token(), "ya29.a");
    now = 1000 + 3600 - 60;
    const renewed = token();
    calls[1].resolve({ access_token: "ya29.b", expires_in: 3600 });
    assert.equal(await renewed, "ya29.b");
  });

  it("drops a failed fetch, so the next read asks again rather than inheriting the failure", async () => {
    const { calls, fetchToken } = fetcher();
    const token = createTokenCache(fetchToken, () => 1000);

    const failed = token();
    calls[0].reject(new Error("metadata server answered 500"));
    await assert.rejects(failed, /metadata server answered 500/);

    const retried = token();
    calls[1].resolve({ access_token: "ya29.b", expires_in: 3600 });
    assert.equal(await retried, "ya29.b");
  });
});
