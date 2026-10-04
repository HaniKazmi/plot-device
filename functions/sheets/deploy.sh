#!/usr/bin/env bash
# Deploys the sheets function. Every deployment value is stated here, so a redeploy cannot drift from
# the last one; the session secret is the one value kept out, read from Secret Manager at start-up.
#
# One-time setup this assumes (see README.md in this folder): the APIs enabled, the service account
# created and shared as Viewer on the Trackers book, and the `sheets-session-secret` secret created
# with that account allowed to read it.
set -euo pipefail

PROJECT="${PROJECT:?set PROJECT to the GCP project id}"
CLIENT_ID="${CLIENT_ID:?set CLIENT_ID to the value of VITE_GOOGLE_CLIENT_ID}"
REGION="${REGION:-us-central1}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-plot-device-sheets-readonly@${PROJECT}.iam.gserviceaccount.com}"

ALLOWED_EMAILS="${ALLOWED_EMAILS:?set ALLOWED_EMAILS to the comma-separated Google accounts that may read}"
ALLOWED_ORIGINS="https://plot.hani.fyi,http://localhost:5173"

cd "$(dirname "$0")"

# `^;^` makes `;` the separator between variables, so the comma-separated lists inside them survive;
# `@` would be the obvious pick and is in every email address on the allowlist.
# Two instances at most: the function serves one reader, and the cap is what bounds the bill if
# something hammers a public URL. A whole vCPU is what lets one instance take concurrent requests at
# all; at the default sixth of one, each instance holds a single request, and the app's four reads
# queue two deep behind a cap of two.
gcloud functions deploy sheets \
  --project="$PROJECT" \
  --gen2 \
  --region="$REGION" \
  --runtime=nodejs24 \
  --source=. \
  --entry-point=sheets \
  --trigger-http \
  --allow-unauthenticated \
  --service-account="$SERVICE_ACCOUNT" \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=8 \
  --max-instances=2 \
  --set-env-vars="^;^GOOGLE_CLIENT_ID=${CLIENT_ID};ALLOWED_EMAILS=${ALLOWED_EMAILS};ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --set-secrets="SESSION_SECRET=sheets-session-secret:latest"

gcloud functions describe sheets --project="$PROJECT" --region="$REGION" --format='value(serviceConfig.uri)'
