import { describe, expect, it } from "vitest";
import { isGrant, isRefusal, isSessionValid, parseSession, type Grant, type Session } from "../../src/contexts/token";

const session = (expiresAt: number): Session => ({ token: "v1.payload.signature", expiresAt });

const NOW = 1_700_000_000_000;

describe("parseSession", () => {
  it("reads a stored session back", () => {
    expect(parseSession(JSON.stringify(session(NOW)))).toEqual(session(NOW));
  });

  it("treats an absent value as no session", () => {
    expect(parseSession(null)).toBeNull();
    expect(parseSession("")).toBeNull();
  });

  it("treats unreadable storage as no session instead of throwing", () => {
    // The caller runs inside a useState initialiser, so a throw here would happen during
    // render and blank the page rather than just prompting to authorise again.
    expect(parseSession("{ not json")).toBeNull();
  });

  it("treats a stored value of another shape as no session", () => {
    // What a Google token wrapper looks like, stored under a key an older build may have used.
    expect(parseSession(JSON.stringify({ expiry: NOW, token: { access_token: "ya29" } }))).toBeNull();
    expect(parseSession(JSON.stringify({ token: "v1.a.b" }))).toBeNull();
  });
});

describe("isSessionValid", () => {
  it("accepts a session whose expiry is still ahead", () => {
    expect(isSessionValid(session(NOW + 1000), NOW)).toBe(true);
  });

  it("rejects a session that has expired", () => {
    expect(isSessionValid(session(NOW - 1000), NOW)).toBe(false);
  });

  it("rejects a session expiring exactly now, since the comparison is strict", () => {
    expect(isSessionValid(session(NOW), NOW)).toBe(false);
  });

  it("rejects a missing session", () => {
    expect(isSessionValid(null, NOW)).toBe(false);
  });
});

describe("isGrant", () => {
  it("accepts a response carrying an access token", () => {
    expect(isGrant({ access_token: "abc", expires_in: "3600" } as Grant)).toBe(true);
  });

  it("rejects a refusal, which arrives on the same callback a grant does", () => {
    const denied = { error: "access_denied", error_description: "The user denied the request" } as Grant;

    expect(isGrant(denied)).toBe(false);
  });

  it("rejects a response with no access token, whatever else it carries", () => {
    expect(isGrant({ expires_in: "3600" } as Grant)).toBe(false);
  });
});

describe("isRefusal", () => {
  it("is the function turning the session away", () => {
    expect(isRefusal(401)).toBe(true);
  });

  it("is not a fault with the sheet, which signing in again would not change", () => {
    // A renamed tab or a lost share comes back as a 502 in the Sheets API's own words; clearing the
    // session for it sends the reader to the key for nothing.
    expect(isRefusal(502)).toBe(false);
    expect(isRefusal(500)).toBe(false);
    expect(isRefusal(403)).toBe(false);
  });
});
