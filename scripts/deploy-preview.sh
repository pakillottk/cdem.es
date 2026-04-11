#!/usr/bin/env bash
# Build y despliegue de versión preview en Cloudflare Workers.
# - Usa las claves de Turnstile de test para que los formularios funcionen sin CAPTCHA real.
# - Establece el alias de la versión con el nombre de la rama actual (sanitizado).
#
# Uso:  npm run deploy:preview
#       BRANCH=mi-alias npm run deploy:preview   (alias personalizado)
set -euo pipefail

# ── DEBUG: dump de variables de entorno para detectar cuál tiene la rama ──────
echo "=== DEBUG ENV (branch detection) ==="
echo "GITHUB_REF_NAME   = ${GITHUB_REF_NAME:-<unset>}"
echo "GITHUB_REF        = ${GITHUB_REF:-<unset>}"
echo "CF_PAGES_BRANCH   = ${CF_PAGES_BRANCH:-<unset>}"
echo "git abbrev-ref    = $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<error>')"
echo "git log --decorate= $(git log -1 --pretty=format:'%D' 2>/dev/null || echo '<error>')"
echo "--- todas las vars que contengan BRANCH, REF o COMMIT ---"
env | grep -iE 'branch|ref|commit|sha|head|cf_' | sort || true
echo "==================================="

# ── Alias: rama actual (o override via env) ────────────────────────────────────
if [ -z "${BRANCH:-}" ]; then
  RAW_BRANCH="${GITHUB_REF_NAME:-${CF_PAGES_BRANCH:-}}"
  if [ -z "$RAW_BRANCH" ]; then
    RAW_BRANCH=$(git log -1 --pretty=format:'%D' \
      | tr ',' '\n' \
      | grep -E '^\s*origin/' \
      | head -1 \
      | sed 's|.*origin/||' \
      | tr -d ' \t' \
      || true)
  fi
  if [ -z "$RAW_BRANCH" ]; then
    RAW_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "preview")
  fi
  # Solo caracteres permitidos por Cloudflare para aliases: [a-z0-9-]
  BRANCH=$(echo "$RAW_BRANCH" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9]/-/g' \
    | sed 's/-\{2,\}/-/g'    \
    | sed 's/^-\|-$//g')
fi

echo "▶ Rama → alias: «${BRANCH}»"
echo "▶ Build con claves Turnstile de test (TURNSTILE_SITE_KEY baked in)…"

# La site key (client/public) se bake en el bundle en tiempo de build.
# La secret key se sobreescribe en runtime vía --var (ver más abajo).
TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build

echo "▶ Subiendo versión preview a Cloudflare Workers…"
npx wrangler versions upload \
  --preview-alias "${BRANCH}" \
  --var TURNSTILE_TEST_MODE:true \
  --message "preview: ${BRANCH}"

echo "✓ Preview desplegado."
echo "  Alias: https://${BRANCH}-cdem-es.cdemtic.workers.dev"
