import { describe, expect, it } from "vitest";
import {
  expiryFor,
  isGrant,
  isTokenValid,
  parseTokenWrapper,
  type Token,
  type TokenWrapper,
} from "../../src/contexts/token";

const token = (expiresIn: string) => ({ access_token: "abc", expires_in: expiresIn }) as Token;
const wrapper = (expiry: number): TokenWrapper => ({ expiry, token: token("3600") });

const NOW = 1_700_000_000_000;

describe("parseTokenWrapper", () => {
  it("reads a stored wrapper back", () => {
    const stored = JSON.stringify(wrapper(NOW));

    expect(parseTokenWrapper(stored)?.expiry).toBe(NOW);
  });

  it("treats an absent value as no token", () => {
    expect(parseTokenWrapper(null)).toBeNull();
    expect(parseTokenWrapper("")).toBeNull();
  });

  it("treats unreadable storage as no token instead of throwing", () => {
    // The caller runs inside a useState initialiser, so a throw here would happen during
    // render and blank the page rather than just prompting to authorise again.
    expect(parseTokenWrapper("{ not json")).toBeNull();
  });
});

describe("isGrant", () => {
  it("accepts a response carrying an access token", () => {
    expect(isGrant(token("3600"))).toBe(true);
  });

  it("rejects a refusal, which arrives on the same callback a grant does", () => {
    // Stored, it wraps a NaN expiry around an object with no credential in it, so the app reports
    // itself authorised and every sheet request then fails as though the sheet were unreachable.
    const denied = { error: "access_denied", error_description: "The user denied the request" } as Token;

    expect(isGrant(denied)).toBe(false);
  });

  it("rejects a response with no access token, whatever else it carries", () => {
    expect(isGrant({ expires_in: "3600" } as Token)).toBe(false);
  });
});

describe("isTokenValid", () => {
  it("accepts a token whose expiry is still ahead", () => {
    expect(isTokenValid(wrapper(NOW + 1000), NOW)).toBe(true);
  });

  it("rejects a token that has expired", () => {
    expect(isTokenValid(wrapper(NOW - 1000), NOW)).toBe(false);
  });

  it("rejects a token expiring exactly now, since the comparison is strict", () => {
    expect(isTokenValid(wrapper(NOW), NOW)).toBe(false);
  });

  it("rejects a missing wrapper", () => {
    expect(isTokenValid(null, NOW)).toBe(false);
  });

  it("rejects a NaN expiry, which is how a malformed lifetime surfaces", () => {
    expect(isTokenValid(wrapper(NaN), NOW)).toBe(false);
  });
});

describe("expiryFor", () => {
  it("converts the lifetime in seconds to an absolute epoch time", () => {
    expect(expiryFor(token("3600"), NOW)).toBe(NOW + 3_600_000);
  });

  it("round-trips: a freshly issued token is valid until its lifetime runs out", () => {
    const fresh = { expiry: expiryFor(token("3600"), NOW), token: token("3600") };

    expect(isTokenValid(fresh, NOW)).toBe(true);
    expect(isTokenValid(fresh, NOW + 3_599_000)).toBe(true);
    expect(isTokenValid(fresh, NOW + 3_600_000)).toBe(false);
  });

  it("yields NaN for a lifetime that does not parse", () => {
    // Nothing guards the parse, so the token stores successfully and is then discarded on the
    // very next read rather than being rejected when it was issued.
    expect(expiryFor(token(""), NOW)).toBeNaN();
    expect(expiryFor(token("soon"), NOW)).toBeNaN();
  });

  it("parses a lifetime with trailing text, because parseInt stops at the first non-digit", () => {
    expect(expiryFor(token("3600s"), NOW)).toBe(NOW + 3_600_000);
  });
});
