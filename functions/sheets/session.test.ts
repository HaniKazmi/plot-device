import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueSession, verifySession } from "./session.ts";

const SECRET = Buffer.from("a".repeat(64));
const NOW = 1_800_000_000;
const DAY = 24 * 60 * 60;

describe("issueSession and verifySession", () => {
  it("round-trips the email and expiry it was issued with", () => {
    const { token } = issueSession("reader@example.com", NOW, 30 * DAY, SECRET);

    assert.deepEqual(verifySession(token, NOW + DAY, SECRET), {
      session: { email: "reader@example.com", exp: NOW + 30 * DAY },
    });
  });

  it("refuses a token at the second it expires, since the comparison is strict", () => {
    const { token } = issueSession("reader@example.com", NOW, DAY, SECRET);

    assert.deepEqual(verifySession(token, NOW + DAY, SECRET), { refused: "expired" });
  });

  it("refuses every token once the secret is rotated, which is how every device is signed out", () => {
    const { token } = issueSession("reader@example.com", NOW, DAY, SECRET);

    assert.deepEqual(verifySession(token, NOW, Buffer.from("b".repeat(64))), { refused: "bad signature" });
  });

  it("refuses a payload edited to a later expiry, since the signature covers it", () => {
    const { token } = issueSession("reader@example.com", NOW, DAY, SECRET);
    const [version, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "reader@example.com", exp: NOW + 365 * DAY })).toString(
      "base64url",
    );

    assert.deepEqual(verifySession(`${version}.${forged}.${signature}`, NOW, SECRET), { refused: "bad signature" });
  });

  it("refuses anything not in the three-part shape without throwing", () => {
    for (const token of ["", "v1", "v1.abc", "v2.abc.def", "v1.abc.def.ghi", "not a token"])
      assert.deepEqual(verifySession(token, NOW, SECRET), { refused: "malformed" });
  });
});
