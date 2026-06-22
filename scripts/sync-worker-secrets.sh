#!/usr/bin/env bash
# Sincroniza secrets del entorno al Worker de Cloudflare (cdem-es).
# GitHub Actions define las vars en el job; Wrangler solo las usa en runtime
# si están registradas como Worker secrets (no basta con exportarlas en el shell).
set -euo pipefail

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "✗ CLOUDFLARE_API_TOKEN no definida."
  exit 1
fi

WORKER_NAME="${WORKER_NAME:-cdem-es}"
# Workers con versiones (preview/prod en Wrangler 4) exigen versions secret put.
SECRET_PUT=(npx wrangler versions secret put)

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

synced=0
for name in "${SECRETS[@]}"; do
  # Indirect expansion: valor de la variable cuyo nombre está en $name
  value="${!name:-}"
  if [ -n "$value" ]; then
    echo "▶ wrangler versions secret put ${name}"
    echo "$value" | "${SECRET_PUT[@]}" "$name" --name "$WORKER_NAME"
    synced=$((synced + 1))
  fi
done

if [ "$synced" -eq 0 ]; then
  echo "⚠ Ningún secret en el entorno — el Worker no recibirá variables nuevas."
  echo "  Define secrets en GitHub Actions o exporta las vars antes del deploy."
else
  echo "✓ ${synced} secret(s) sincronizados en ${WORKER_NAME}."
fi
