import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { admit, type TokenInfo } from "./google.ts";

const CLIENT = "client.apps.googleusercontent.com";
const ALLOWED = new Set(["reader@example.com"]);
const INFO: TokenInfo = {
  aud: CLIENT,
  azp: CLIENT,
  email: "Reader@Example.com",
  email_verified: "true",
  expires_in: "3599",
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

  it("refuses a token with no time left, or none stated", () => {
    assert.ok("refused" in admit({ ...INFO, expires_in: "0" }, CLIENT, ALLOWED));
    assert.ok("refused" in admit({ ...INFO, expires_in: undefined }, CLIENT, ALLOWED));
  });
});
