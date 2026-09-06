import { describe, expect, it } from "vitest";
import { authStateOf } from "../../src/app/authState";

const callback = () => {};

describe("authStateOf", () => {
  it("is authorising while neither callback is offered", () => {
    expect(authStateOf({ authorise: undefined, revoke: undefined, raw: {} })).toBe("authorising");
  });

  it("is live where the session can revoke", () => {
    expect(authStateOf({ authorise: undefined, revoke: callback, raw: { game: [] } })).toBe("live");
  });

  it("is stale where a copy is on screen and there is no token", () => {
    expect(authStateOf({ authorise: callback, revoke: undefined, raw: { book: [{}] } })).toBe("stale");
  });

  it("is empty where no library has a copy behind it", () => {
    expect(authStateOf({ authorise: callback, revoke: undefined, raw: {} })).toBe("empty");
  });

  it("keeps the loading state while the scripts land on top of a cache", () => {
    // The cache says nothing about whether Google can be asked yet, and a key offered before the
    // client exists is a key that does nothing when pressed.
    expect(authStateOf({ authorise: undefined, revoke: undefined, raw: { show: [{}] } })).toBe("authorising");
  });

  it("stays stale for rows this session fetched and can no longer refresh", () => {
    // Revoking mid-session, and a failed `values.get` clearing the token, both leave a full page
    // with no way to refresh it: the strip says so, where blanking the page would lose the rows.
    expect(authStateOf({ authorise: callback, revoke: undefined, raw: { game: [{}], movie: [{}] } })).toBe("stale");
  });
});
