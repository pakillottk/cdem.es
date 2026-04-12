#!/usr/bin/env bash
# Espera a que el Worker de Cloudflare tenga una versión desplegada tras el inicio del workflow.
# Requiere: CF_API_TOKEN, CF_ACCOUNT_ID, CF_WORKER, WORKFLOW_STARTED_AT (epoch UTC)
# Opcional: CF_WORKERS_DOMAIN  (ej. cdemtic.workers.dev; si no se pasa, se usa ese valor por defecto)
#
# En éxito escribe en $GITHUB_OUTPUT:
#   version_url=https://{uuid-prefix}-{worker}.{domain}
# La URL es la Version Preview URL específica del commit (inmutable aunque llegue otro deploy).
set -euo pipefail

: "${CF_API_TOKEN:?}"
: "${CF_ACCOUNT_ID:?}"
: "${CF_WORKER:?}"
: "${WORKFLOW_STARTED_AT:?}"

cf_trim() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | tr -d '\r\n'
}

CF_ACCOUNT_ID=$(cf_trim "$CF_ACCOUNT_ID")
CF_WORKER=$(cf_trim "$CF_WORKER")
DOMAIN="${CF_WORKERS_DOMAIN:-cdemtic.workers.dev}"

MAX_ATTEMPTS="${WAIT_MAX_ATTEMPTS:-40}"
INTERVAL_SEC="${WAIT_INTERVAL_SEC:-30}"

VERSIONS_API="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${CF_WORKER}/versions"

echo "Esperando versión del Worker «${CF_WORKER}» posterior a epoch ${WORKFLOW_STARTED_AT}"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  json=$(curl -sS "${VERSIONS_API}?per_page=5" \
    -H "Authorization: Bearer ${CF_API_TOKEN}")

  if ! echo "$json" | jq -e '.success == true' >/dev/null 2>&1; then
    err_msg=$(echo "$json" | jq -r '.errors[0].message // empty')
    echo "::error::API Cloudflare Workers Versions: ${err_msg:-respuesta inesperada}"
    echo "$json" | jq . >&2
    exit 1
  fi

  # El primer item es siempre la versión más reciente
  latest=$(echo "$json" | jq -c '.result.items[0] // empty')

  if [ -z "$latest" ] || [ "$latest" = "null" ]; then
    echo "::error::No hay versiones del Worker «${CF_WORKER}»."
    exit 1
  fi

  version_id=$(echo "$latest" | jq -r '.id // empty')
  created_on=$(echo "$latest" | jq -r '.metadata.created_on // empty')

  if [ -z "$version_id" ] || [ -z "$created_on" ]; then
    echo "Intento ${attempt}/${MAX_ATTEMPTS}: respuesta incompleta de la API, reintentando…"
    sleep "$INTERVAL_SEC"
    continue
  fi

  created_ts=$(date -d "$created_on" +%s 2>/dev/null \
    || date -j -f "%Y-%m-%dT%H:%M:%S" "${created_on%%.*}" +%s 2>/dev/null \
    || echo "0")

  echo "Intento ${attempt}/${MAX_ATTEMPTS}: versión ${version_id} creada en ${created_on} (epoch ${created_ts}), workflow iniciado en epoch ${WORKFLOW_STARTED_AT}"

  if [ "$created_ts" -gt "$WORKFLOW_STARTED_AT" ]; then
    # El prefijo de la URL de versión es el primer segmento del UUID (antes del primer guion)
    uuid_prefix="${version_id%%-*}"
    VERSION_URL="https://${uuid_prefix}-${CF_WORKER}.${DOMAIN}"
    echo "✓ Worker «${CF_WORKER}» versión ${version_id} lista."
    echo "  Version Preview URL: ${VERSION_URL}"
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
      echo "version_url=${VERSION_URL}" >> "$GITHUB_OUTPUT"
    fi
    exit 0
  fi

  echo "Versión aún no actualizada… (esperando ${INTERVAL_SEC}s)"
  sleep "$INTERVAL_SEC"
done

echo "::error::Tiempo de espera agotado esperando nueva versión del Worker «${CF_WORKER}»."
exit 1
