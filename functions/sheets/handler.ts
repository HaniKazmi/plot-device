import type { Config } from "./config.ts";
import { admit, type TokenInfo } from "./google.ts";
import { SESSION_HEADER, issueSession, verifySession } from "./session.ts";

/** The parts of a request the routes read, so a test can build one without Express. */
export interface Request {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body: unknown;
}

export interface Response {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
}

/** What the routes reach outside the process for, injected so the routing is testable offline. */
export interface Deps {
  fetchTokenInfo: (accessToken: string) => Promise<TokenInfo | undefined>;
  serviceAccountToken: () => Promise<string>;
  readRange: (spreadsheetId: string, range: string, token: string) => Promise<globalThis.Response>;
  nowSeconds: () => number;
  warn: (message: string) => void;
}

const header = (request: Request, name: string) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * One body for every refused session, so a caller cannot tell a forged token from an expired one.
 * The app reads a 401 as "sign in again" and clears what it holds; that is the only status here
 * that does, so an upstream fault never signs the reader out.
 */
const UNAUTHORISED = { error: "Sign in again to read the sheets." };

const json = (status: number, body: unknown): Response => ({
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body,
});

/**
 * Builds the request handler: `POST /session` trades a Google access token for the function's own
 * session, and `GET /values` reads one range with the attached service account.
 *
 * A read is one range and not the four together because the app issues them concurrently, which
 * measures faster than one batch, and fails them separately, so a renamed tab empties one medium
 * rather than all four. The range itself comes from the app's own `tabs.ts`, which stays the one
 * place a sheet is named. Which spreadsheets a read can reach is the service account's own sharing —
 * a Viewer on the Trackers book and nothing else — so a list here would be a second copy of the
 * sheet's id to keep in step with `tabs.ts`, guarding against a reader who is already on the
 * allowlist.
 */
export const createHandler = (config: Config, deps: Deps) => {
  const cors = (request: Request): Record<string, string> => {
    const origin = header(request, "origin");
    const headers: Record<string, string> = { Vary: "Origin" };
    if (origin && config.allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
    return headers;
  };

  const session = async (request: Request): Promise<Response> => {
    const accessToken = (request.body as { accessToken?: unknown } | undefined)?.accessToken;
    if (typeof accessToken !== "string" || !accessToken) return json(400, { error: "accessToken is required" });

    const info = await deps.fetchTokenInfo(accessToken);
    if (!info) {
      deps.warn("session refused: Google did not recognise the access token");
      return json(401, UNAUTHORISED);
    }
    const verdict = admit(info, config.clientId, config.allowedEmails);
    if ("refused" in verdict) {
      deps.warn(`session refused: ${verdict.refused}`);
      // 403 rather than 401: the token was genuine and the reader is simply not on the list, which
      // signing in again with the same account will not change.
      return json(403, { error: "This account cannot read these sheets." });
    }

    const { token, session } = issueSession(
      verdict.email,
      deps.nowSeconds(),
      config.sessionSeconds,
      config.sessionSecret,
    );
    return json(200, { token, expiresAt: session.exp * 1000 });
  };

  const values = async (request: Request): Promise<Response> => {
    const token = header(request, SESSION_HEADER)?.trim();
    const verdict = token
      ? verifySession(token, deps.nowSeconds(), config.sessionSecret)
      : { refused: "no session header" };
    if ("refused" in verdict) {
      deps.warn(`read refused: ${verdict.refused}`);
      return json(401, UNAUTHORISED);
    }

    const { spreadsheetId, range } = request.query;
    if (typeof spreadsheetId !== "string" || typeof range !== "string" || !range)
      return json(400, { error: "spreadsheetId and range are required" });

    const upstream = await deps.readRange(spreadsheetId, range, await deps.serviceAccountToken());
    const body = (await upstream.json().catch(() => undefined)) as { error?: { message?: string } } | undefined;
    if (!upstream.ok) {
      // A 502 and Google's own words: a renamed tab answers "Unable to parse range", which names
      // the fault, and a 403 from Sheets means the service account has lost its share — neither is
      // the reader's session, so neither may come back as the 401 that signs them out.
      const message = body?.error?.message ?? upstream.statusText;
      return json(502, { error: `Sheets answered ${upstream.status} for ${range}: ${message}` });
    }
    return json(200, body);
  };

  return async (request: Request): Promise<Response> => {
    const headers = cors(request);
    const respond = (response: Response): Response => ({ ...response, headers: { ...headers, ...response.headers } });

    if (request.method === "OPTIONS")
      return respond({
        status: 204,
        headers: {
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": `${SESSION_HEADER}, content-type`,
          "Access-Control-Max-Age": "86400",
        },
      });
    try {
      if (request.method === "POST" && request.path === "/session") return respond(await session(request));
      if (request.method === "GET" && request.path === "/values") return respond(await values(request));
      return respond(json(404, { error: "Not found" }));
    } catch (error) {
      // Answered here rather than by the framework so the CORS headers ride along: without them the
      // browser hides the response and the app reads a failure of this function as being offline.
      deps.warn(`request failed: ${error instanceof Error ? error.stack : String(error)}`);
      return respond(json(500, { error: "The sheets function failed; its log has the cause." }));
    }
  };
};
