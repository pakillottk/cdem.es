#!/usr/bin/env bash
# Build y despliegue de producción en Cloudflare Workers.
set -euo pipefail

npm run build

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "✗ CLOUDFLARE_API_TOKEN no definida."
  exit 1
fi
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "✗ CLOUDFLARE_ACCOUNT_ID no definida."
  exit 1
fi
export CLOUDFLARE_ACCOUNT_ID

SECRETS_FILE=$(mktemp)
trap 'rm -f "$SECRETS_FILE"' EXIT
bash scripts/sync-worker-secrets.sh "$SECRETS_FILE"

npx wrangler deploy --secrets-file "$SECRETS_FILE"

echo "✓ Producción desplegada."
