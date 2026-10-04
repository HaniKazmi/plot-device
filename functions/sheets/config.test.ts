import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "./config.ts";

const ENV = {
  GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com",
  ALLOWED_EMAILS: "Reader@Example.com, second@example.com",
  ALLOWED_ORIGINS: "https://plot.hani.fyi,http://localhost:5173",
  SESSION_SECRET: "s".repeat(64),
};

describe("loadConfig", () => {
  it("reads lists as trimmed sets and lowercases the allowlist", () => {
    const config = loadConfig(ENV);

    assert.deepEqual([...config.allowedEmails], ["reader@example.com", "second@example.com"]);
    assert.deepEqual([...config.allowedOrigins], ["https://plot.hani.fyi", "http://localhost:5173"]);
  });

  it("gives a session thirty days unless told otherwise", () => {
    assert.equal(loadConfig(ENV).sessionSeconds, 30 * 24 * 60 * 60);
    assert.equal(loadConfig({ ...ENV, SESSION_DAYS: "90" }).sessionSeconds, 90 * 24 * 60 * 60);
  });

  it("refuses to start on an empty allowlist rather than reading it as no restriction", () => {
    assert.throws(() => loadConfig({ ...ENV, ALLOWED_EMAILS: " , " }), /ALLOWED_EMAILS is not set/);
  });

  it("refuses to start without each required variable, naming it", () => {
    for (const name of Object.keys(ENV)) {
      const env: Record<string, string> = { ...ENV };
      delete env[name];
      assert.throws(() => loadConfig(env), new RegExp(`${name} is not set`));
    }
  });

  it("refuses a short secret and a session length that is not a positive number", () => {
    assert.throws(() => loadConfig({ ...ENV, SESSION_SECRET: "short" }), /at least 32/);
    assert.throws(() => loadConfig({ ...ENV, SESSION_DAYS: "0" }), /SESSION_DAYS/);
    assert.throws(() => loadConfig({ ...ENV, SESSION_DAYS: "soon" }), /SESSION_DAYS/);
  });
});
