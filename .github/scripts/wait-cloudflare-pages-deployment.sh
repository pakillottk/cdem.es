#!/usr/bin/env bash
# Espera a que el Worker de Cloudflare haya sido desplegado tras el inicio del workflow.
# Requiere: CF_API_TOKEN, CF_ACCOUNT_ID, CF_WORKER, WORKFLOW_STARTED_AT (epoch UTC)
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

MAX_ATTEMPTS="${WAIT_MAX_ATTEMPTS:-40}"
INTERVAL_SEC="${WAIT_INTERVAL_SEC:-30}"

SCRIPTS_API="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts"

echo "Esperando despliegue del Worker «${CF_WORKER}» (posterior a epoch ${WORKFLOW_STARTED_AT})"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  json=$(curl -sS "${SCRIPTS_API}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}")

  if ! echo "$json" | jq -e '.success == true' >/dev/null 2>&1; then
    err_msg=$(echo "$json" | jq -r '.errors[0].message // empty')
    echo "::error::API Cloudflare Workers: ${err_msg}"
    echo "$json" | jq .
    exit 1
  fi

  # Buscar el script por nombre y obtener su modified_on
  modified_on=$(echo "$json" | jq -r --arg name "$CF_WORKER" '
    (.result // [])
    | map(select(.id == $name))
    | .[0].modified_on // empty
  ')

  if [ -z "$modified_on" ]; then
    # Listar los scripts disponibles para ayudar al diagnóstico
    names=$(echo "$json" | jq -r '[(.result // [])[] | .id] | join(", ")')
    echo "::error::Worker «${CF_WORKER}» no encontrado en esta cuenta."
    echo "::notice::Workers disponibles: ${names:-ninguno}"
    exit 1
  fi

  # Convertir modified_on a epoch (compatible con GNU date y macOS date)
  modified_ts=$(date -d "$modified_on" +%s 2>/dev/null \
    || date -j -f "%Y-%m-%dT%H:%M:%S" "${modified_on%%.*}" +%s 2>/dev/null \
    || echo "0")

  echo "Intento ${attempt}/${MAX_ATTEMPTS}: Worker modificado en ${modified_on} (epoch ${modified_ts}), workflow iniciado en epoch ${WORKFLOW_STARTED_AT}"

  if [ "$modified_ts" -gt "$WORKFLOW_STARTED_AT" ]; then
    echo "Worker «${CF_WORKER}» desplegado correctamente tras el inicio del workflow."
    exit 0
  fi

  echo "Aún no hay despliegue nuevo… (esperando ${INTERVAL_SEC}s)"
  sleep "$INTERVAL_SEC"
done

echo "::error::Tiempo de espera agotado esperando el despliegue del Worker «${CF_WORKER}»."
exit 1
