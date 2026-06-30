#!/usr/bin/env bash
# Escribe secrets del entorno a un fichero para Wrangler (--secrets-file).
# Los secrets deben ir en el mismo upload que crea la versión; si se hace
# `versions secret put` antes de `versions upload`, la versión nueva no los hereda.
#
# Uso:  bash scripts/sync-worker-secrets.sh /tmp/worker-secrets.json
set -euo pipefail

OUTFILE="${1:-}"
if [ -z "$OUTFILE" ]; then
  echo "✗ Uso: $0 <ruta-salida.json>" >&2
  exit 1
fi

# Orden: Keystatic (CMS) → contacto → Turnstile prod
SECRETS=(
  KEYSTATIC_GITHUB_CLIENT_ID
  KEYSTATIC_GITHUB_CLIENT_SECRET
  KEYSTATIC_SECRET
  RESEND_API_KEY
  CONTACT_EMAIL_TO
  FROM_EMAIL
  TURNSTILE_SECRET_KEY
)

export SECRETS_JSON_NAMES="${SECRETS[*]}"
node --input-type=module -e "
import { writeFileSync } from 'node:fs';

const names = (process.env.SECRETS_JSON_NAMES ?? '').split(/\\s+/).filter(Boolean);
const out = {};
for (const name of names) {
  const value = process.env[name];
  if (value) out[name] = value;
}
writeFileSync(process.argv[1], JSON.stringify(out));
" "$OUTFILE"

count=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))).length)" "$OUTFILE")
if [ "$count" -eq 0 ]; then
  echo "⚠ Ningún secret en el entorno — el Worker no recibirá variables nuevas." >&2
  echo "  Define secrets en GitHub Actions o en Workers → Settings → Variables." >&2
else
  echo "✓ ${count} secret(s) listos para --secrets-file."
fi
