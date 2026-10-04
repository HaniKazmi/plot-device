import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "./config.ts";
import { createHandler, type Deps, type FunctionRequest } from "./handler.ts";
import { issueSession } from "./session.ts";

const NOW = 1_800_000_000;
const CLIENT = "client.apps.googleusercontent.com";
const config = loadConfig({
  GOOGLE_CLIENT_ID: CLIENT,
  ALLOWED_EMAILS: "reader@example.com",
  ALLOWED_ORIGINS: "https://plot.hani.fyi",
  SESSION_SECRET: "s".repeat(64),
});

const grid = { range: "Games!A1:Z3", majorDimension: "ROWS", values: [["Title"], ["Outer Wilds"]] };

const deps = (overrides: Partial<Deps> = {}): Deps => ({
  fetchTokenInfo: async () => ({
    aud: CLIENT,
    email: "reader@example.com",
    email_verified: "true",
  }),
  serviceAccountToken: async () => "sa-token",
  readRange: async () => new Response(JSON.stringify(grid), { status: 200 }),
  nowSeconds: () => NOW,
  warn: () => {},
  ...overrides,
});

const request = (overrides: Partial<FunctionRequest>): FunctionRequest => ({
  method: "GET",
  path: "/",
  headers: { origin: "https://plot.hani.fyi" },
  query: {},
  body: undefined,
  ...overrides,
});

const sessionToken = (exp = 30 * 24 * 60 * 60) =>
  issueSession("reader@example.com", NOW, exp, config.sessionSecret).token;

const read = (
  token: string | undefined,
  query: Record<string, unknown> = { spreadsheetId: "sheet-1", range: "Games!A:Z" },
) =>
  request({
    path: "/values",
    query,
    headers: { origin: "https://plot.hani.fyi", "x-plot-session": token },
  });

describe("POST /session", () => {
  it("trades an admitted access token for a session that the read route then accepts", async () => {
    const handle = createHandler(config, deps());
    const response = await handle(request({ method: "POST", path: "/session", body: { accessToken: "ya29.x" } }));
    const { token, expiresAt } = response.body as { token: string; expiresAt: number };

    assert.equal(response.status, 200);
    assert.equal(expiresAt, (NOW + config.sessionSeconds) * 1000);
    assert.equal((await handle(read(token))).status, 200);
  });

  it("answers 401 for a token Google does not recognise", async () => {
    const handle = createHandler(config, deps({ fetchTokenInfo: async () => undefined }));
    const response = await handle(request({ method: "POST", path: "/session", body: { accessToken: "stale" } }));

    assert.equal(response.status, 401);
  });

  it("answers 403 for a genuine account off the list, which signing in again will not change", async () => {
    const handle = createHandler(
      config,
      deps({
        fetchTokenInfo: async () => ({ aud: CLIENT, email: "x@example.com", email_verified: "true" }),
      }),
    );
    const response = await handle(request({ method: "POST", path: "/session", body: { accessToken: "ya29.x" } }));

    assert.equal(response.status, 403);
  });

  it("answers 400 without a token rather than asking Google about nothing", async () => {
    let asked = false;
    const handle = createHandler(config, deps({ fetchTokenInfo: async () => ((asked = true), undefined) }));
    const response = await handle(request({ method: "POST", path: "/session", body: {} }));

    assert.equal(response.status, 400);
    assert.equal(asked, false);
  });
});

describe("GET /values", () => {
  it("answers the range's rows alone, so the app never reads the Sheets API's own shape", async () => {
    const response = await createHandler(config, deps())(read(sessionToken()));

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { values: grid.values });
  });

  it("reports an emptied tab as a sheet fault rather than a library with no rows", async () => {
    // Read as no rows, the app would store an empty library over the copy a cold visit paints from.
    const empty = new Response(JSON.stringify({ range: "Games!A1:Z1", majorDimension: "ROWS" }), { status: 200 });
    const response = await createHandler(config, deps({ readRange: async () => empty }))(read(sessionToken()));

    assert.equal(response.status, 502);
    assert.match((response.body as { error: string }).error, /Games!A:Z answered no rows/);
  });

  it("answers 401 for a missing, expired or forged session, and never touches the sheet", async () => {
    let reads = 0;
    const handle = createHandler(
      config,
      deps({
        readRange: async () => {
          reads++;
          return new Response("{}");
        },
      }),
    );

    for (const token of [undefined, sessionToken(-1), `${sessionToken().slice(0, -2)}xx`])
      assert.equal((await handle(read(token))).status, 401);
    assert.equal(reads, 0);
  });

  it("reports a Sheets refusal as a 502 in Google's words, never as the 401 that signs a reader out", async () => {
    const renamed = new Response(JSON.stringify({ error: { message: "Unable to parse range: Gamez!A:Z" } }), {
      status: 400,
    });
    const response = await createHandler(config, deps({ readRange: async () => renamed }))(read(sessionToken()));

    assert.equal(response.status, 502);
    assert.match((response.body as { error: string }).error, /Unable to parse range: Gamez!A:Z/);
  });

  it("answers a thrown failure as a 500 that still carries the CORS headers", async () => {
    const handle = createHandler(
      config,
      deps({
        serviceAccountToken: async () => {
          throw new Error("metadata server down");
        },
      }),
    );
    const response = await handle(read(sessionToken()));

    assert.equal(response.status, 500);
    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://plot.hani.fyi");
  });
});

describe("CORS", () => {
  it("answers a preflight for the two headers the app sends", async () => {
    const response = await createHandler(config, deps())(request({ method: "OPTIONS", path: "/values" }));

    assert.equal(response.status, 204);
    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://plot.hani.fyi");
    assert.equal(response.headers["Access-Control-Allow-Headers"], "x-plot-session, content-type");
  });

  it("names no origin to a page off the list", async () => {
    const response = await createHandler(
      config,
      deps(),
    )(request({ method: "OPTIONS", path: "/values", headers: { origin: "https://elsewhere.example" } }));

    assert.equal(response.headers["Access-Control-Allow-Origin"], undefined);
    assert.equal(response.headers.Vary, "Origin");
  });
});
