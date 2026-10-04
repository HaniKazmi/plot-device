# Sheets function

A Cloud Run function that reads Plot Device's spreadsheet ranges with its own service account, so the
app signs in with Google once a month per device rather than once an hour.

- `POST /session` takes a Google access token from the app's sign-in popup (scope `openid email`),
  checks with Google that it was issued to the app's OAuth client for a verified address on
  `ALLOWED_EMAILS`, and answers a session token signed with `SESSION_SECRET`.
- `GET /values?spreadsheetId=…&range=…` takes that session in an `X-Plot-Session` header and answers
  `{ values }` for one range, the rows as the Sheets API reads them with no render options, gzipped.

A 401 means the session is over and is the only status the app signs out on. A fault with the sheet —
a renamed tab, an emptied one, a lost share — comes back as a 502 whose `error` names it.

## Running it locally

```bash
npm install
GOOGLE_CLIENT_ID=… ALLOWED_EMAILS=you@example.com \
ALLOWED_ORIGINS=http://localhost:5173 SESSION_SECRET=$(openssl rand -hex 32) \
GOOGLE_APPLICATION_CREDENTIALS=~/.config/plot-device/sa.json \
npx functions-framework --target=sheets --port=8090
```

Then put `VITE_SHEETS_URL=http://localhost:8090` in the app's `.env.local`. With a key file the
function signs its own token exchange; deployed, it asks the metadata server for the attached
account's token instead, so no key exists in the cloud.

`npm test` and `npm run typecheck` are the checks; CI runs both. Node runs the `.ts` files directly,
so the syntax is held to what type stripping erases (`erasableSyntaxOnly`).

## Deploying

One-time setup, in the project the service account belongs to. It need not be the project that owns the app's OAuth client: the function checks tokens against Google by client id, whatever project issued them.

```bash
gcloud services enable run.googleapis.com cloudfunctions.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com sheets.googleapis.com

gcloud iam service-accounts create plot-device-sheets-readonly --display-name="Plot Device sheet reads"

openssl rand -hex 32 | gcloud secrets create sheets-session-secret --data-file=-
gcloud secrets add-iam-policy-binding sheets-session-secret \
  --member="serviceAccount:plot-device-sheets-readonly@$PROJECT.iam.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor
```

Share the Trackers book with `plot-device-sheets-readonly@<project>.iam.gserviceaccount.com` as **Viewer**,
and nothing else. That share is the whole of what the function can read.

Then deploy, and redeploy the same way after any change here:

```bash
PROJECT=… CLIENT_ID=… ALLOWED_EMAILS=you@example.com ./deploy.sh
```

It prints the function's URL. That URL is `VITE_SHEETS_URL`: in `.env.local` for local builds and as
a repository secret for CI's deploy.

`REGION` defaults to `us-central1`, where the free tier's egress allowance applies. Each deploy leaves
a container image in Artifact Registry's `gcf-artifacts` repository, whose free allowance is 0.5 GB,
so give that repository a cleanup policy keeping the latest two.

Signing every device out is rotating the secret and redeploying:

```bash
openssl rand -hex 32 | gcloud secrets versions add sheets-session-secret --data-file=-
```
