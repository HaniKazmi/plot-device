import { http } from "@google-cloud/functions-framework";
import { gzipSync } from "node:zlib";
import { loadConfig } from "./config.ts";
import { fetchTokenInfo, readRange, serviceAccountToken } from "./google.ts";
import { createHandler } from "./handler.ts";

// Read at start-up, so a deployment missing a variable fails to start and says which, rather than
// answering every request with an error the app reports as a sheet fault.
const config = loadConfig(process.env);

const handle = createHandler(config, {
  fetchTokenInfo,
  serviceAccountToken: () => serviceAccountToken(config.credentialsPath),
  readRange,
  nowSeconds: () => Math.floor(Date.now() / 1000),
  warn: (message) => console.warn(message),
});

/**
 * Compressed here because Cloud Run sends a response as the container wrote it. The four grids are
 * 494 KB as JSON and 98 KB gzipped, which is the difference between the free tier's 1 GB of egress
 * lasting about two thousand dashboard loads a month and about ten thousand.
 */
const accepts = (header: string | undefined) => /\bgzip\b/.test(header ?? "");

http("sheets", async (req, res) => {
  const response = await handle(req);
  res.status(response.status).set(response.headers);
  if (response.body === undefined) {
    res.end();
    return;
  }
  const body = JSON.stringify(response.body);
  res.append("Vary", "Accept-Encoding");
  if (accepts(req.get("accept-encoding"))) res.set("Content-Encoding", "gzip").send(gzipSync(body));
  else res.send(body);
});
