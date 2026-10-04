import { describe, expect, it } from "vitest";
import { authStateOf } from "../../src/app/authState";

const callback = () => {};

describe("authStateOf", () => {
  it("is authorising while neither callback is offered", () => {
    expect(authStateOf({ authorise: undefined, signOut: undefined, raw: {} })).toBe("authorising");
  });

  it("is live where there is a session to sign out of", () => {
    expect(authStateOf({ authorise: undefined, signOut: callback, raw: { game: [] } })).toBe("live");
  });

  it("is stale where a copy is on screen and there is no session", () => {
    // Signing out mid-session, and a read the function refused, both leave a full page
    // with no way to refresh it: the key's dot says so, where blanking the page would lose the
    // rows.
    expect(authStateOf({ authorise: callback, signOut: undefined, raw: { book: [{}] } })).toBe("stale");
  });

  it("is empty where no library has a copy behind it", () => {
    expect(authStateOf({ authorise: callback, signOut: undefined, raw: {} })).toBe("empty");
  });

  it("keeps the loading state while the sign-in script lands on top of a cache", () => {
    // The cache says nothing about whether Google can be asked yet, and a key offered before the
    // client exists is a key that does nothing when pressed.
    expect(authStateOf({ authorise: undefined, signOut: undefined, raw: { show: [{}] } })).toBe("authorising");
  });
});
