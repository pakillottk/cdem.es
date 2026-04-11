#!/usr/bin/env bash
# Espera a que Cloudflare Pages tenga un despliegue exitoso para el commit dado.
# Requiere: CF_API_TOKEN, CF_ACCOUNT_ID, CF_PROJECT, COMMIT_SHA
set -euo pipefail

: "${CF_API_TOKEN:?}"
: "${CF_ACCOUNT_ID:?}"
: "${CF_PROJECT:?}"
: "${COMMIT_SHA:?}"

# GitHub Secrets a veces guardan un salto de línea al final al pegar; la API entonces busca «cdem-es⏎» y devuelve 8000007.
cf_trim() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | tr -d '\r\n'
}

CF_ACCOUNT_ID=$(cf_trim "$CF_ACCOUNT_ID")
CF_PROJECT=$(cf_trim "$CF_PROJECT")
COMMIT_SHA=$(cf_trim "$COMMIT_SHA")

if [ -z "$CF_PROJECT" ]; then
  echo "::error::CLOUDFLARE_PAGES_PROJECT quedó vacío tras quitar espacios/saltos de línea. Vuelve a guardar el secret sin espacio extra al final."
  exit 1
fi

API="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT}/deployments"
MAX_ATTEMPTS="${WAIT_MAX_ATTEMPTS:-40}"
INTERVAL_SEC="${WAIT_INTERVAL_SEC:-30}"

commit_lc=$(echo "$COMMIT_SHA" | tr '[:upper:]' '[:lower:]')

echo "Esperando despliegue en Cloudflare Pages — proyecto «${CF_PROJECT}», commit ${commit_lc:0:7}"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  row=""
  page=1
  while true; do
    # No se pasa per_page: la API de Pages rechaza valores concretos (8000024).
    # Se pagina solo si result_info indica más páginas.
    if [ "$page" -eq 1 ]; then
      json=$(curl -sS "${API}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}")
    else
      json=$(curl -sS "${API}?page=${page}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}")
    fi

    if ! echo "$json" | jq -e '.success == true' >/dev/null 2>&1; then
      err_code=$(echo "$json" | jq -r '.errors[0].code // empty')
      err_msg=$(echo "$json" | jq -r '.errors[0].message // empty')
      echo "::error::API Cloudflare: ${err_msg}"
      echo "$json" | jq .
      if [ "$err_code" = "8000007" ]; then
        echo "::error::Proyecto Pages no encontrado para esta cuenta (API 8000007)."
        list_json=$(curl -sS "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects" \
          -H "Authorization: Bearer ${CF_API_TOKEN}")
        if echo "$list_json" | jq -e '.success == true' >/dev/null 2>&1; then
          names=$(echo "$list_json" | jq -r '(.result // []) | map(.name) | join(", ")')
          echo "::notice::Proyectos Pages visibles para este token en esta cuenta: ${names:-ninguno}"
        else
          echo "::notice::No se pudo listar proyectos Pages: $(echo "$list_json" | jq -r '.errors[0].message // empty')"
        fi
      fi
      exit 1
    fi

    row=$(echo "$json" | jq -c --arg sha "$commit_lc" '
      (.result // [])
      | map(select(
          (.deployment_trigger.metadata.commit_hash // "" | ascii_downcase) == $sha
          and (.is_skipped != true)
        ))
      | .[0] // empty
    ')

    [[ -n "$row" && "$row" != "null" ]] && break

    total_pages=$(echo "$json" | jq -r '.result_info.total_pages // 1')
    if ! [[ "$total_pages" =~ ^[0-9]+$ ]] || [ "$page" -ge "$total_pages" ]; then
      break
    fi
    page=$((page + 1))
  done

  if [[ -z "$row" || "$row" == "null" ]]; then
    echo "Intento ${attempt}/${MAX_ATTEMPTS}: aún no hay despliegue para el commit ${commit_lc:0:7}… (esperando ${INTERVAL_SEC}s)"
    sleep "$INTERVAL_SEC"
    continue
  fi

  status=$(echo "$row" | jq -r '.latest_stage.status // empty')
  stage=$(echo "$row" | jq -r '.latest_stage.name // empty')
  url=$(echo "$row" | jq -r '.url // empty')
  echo "Intento ${attempt}/${MAX_ATTEMPTS}: commit encontrado — stage=${stage} status=${status} url=${url}"

  case "$status" in
    success)
      echo "Despliegue Cloudflare Pages listo."
      exit 0
      ;;
    failure|canceled)
      echo "::error::El despliegue terminó en estado: ${status}"
      exit 1
      ;;
    *)
      sleep "$INTERVAL_SEC"
      ;;
  esac
done

echo "::error::Tiempo de espera agotado esperando el despliegue de Cloudflare Pages."
exit 1
