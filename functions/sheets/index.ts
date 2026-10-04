import { http } from "@google-cloud/functions-framework";
import { promisify } from "node:util";
import { gzip as gzipCallback } from "node:zlib";
import { loadConfig } from "./config.ts";
import { createTokenCache, fetchServiceAccountToken, fetchTokenInfo, readRange } from "./google.ts";
import { createHandler } from "./handler.ts";

// Read at start-up, so a deployment missing a variable fails to start and says which, rather than
// answering every request with an error the app reports as a sheet fault.
const config = loadConfig(process.env);

const nowSeconds = () => Math.floor(Date.now() / 1000);

const handle = createHandler(config, {
  fetchTokenInfo,
  serviceAccountToken: createTokenCache(() => fetchServiceAccountToken(config.credentialsPath), nowSeconds),
  readRange,
  nowSeconds,
  warn: (message) => console.warn(message),
});

/**
 * Compressed here because Cloud Run sends a response as the container wrote it. The four grids are
 * 494 KB as JSON and 98 KB gzipped, which is the difference between the free tier's 1 GB of egress
 * lasting about two thousand dashboard loads a month and about ten thousand.
 */
const accepts = (header: string | undefined) => /\bgzip\b/.test(header ?? "");

// On the thread pool rather than the event loop, so the app's four concurrent reads compress side
// by side instead of each waiting behind the last.
const gzip = promisify(gzipCallback);

http("sheets", async (req, res) => {
  const response = await handle(req);
  res.status(response.status).set(response.headers);
  if (response.body === undefined) {
    res.end();
    return;
  }
  const body = JSON.stringify(response.body);
  res.append("Vary", "Accept-Encoding");
  if (accepts(req.get("accept-encoding"))) res.set("Content-Encoding", "gzip").send(await gzip(body));
  else res.send(body);
});
