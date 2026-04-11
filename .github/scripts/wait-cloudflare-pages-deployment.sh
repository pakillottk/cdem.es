#!/usr/bin/env bash
# Espera a que Cloudflare Pages tenga un despliegue exitoso para el commit dado.
# Requiere: CF_API_TOKEN, CF_ACCOUNT_ID, CF_PROJECT, COMMIT_SHA
set -euo pipefail

: "${CF_API_TOKEN:?}"
: "${CF_ACCOUNT_ID:?}"
: "${CF_PROJECT:?}"
: "${COMMIT_SHA:?}"

API="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT}/deployments"
MAX_ATTEMPTS="${WAIT_MAX_ATTEMPTS:-40}"
INTERVAL_SEC="${WAIT_INTERVAL_SEC:-30}"

commit_lc=$(echo "$COMMIT_SHA" | tr '[:upper:]' '[:lower:]')

echo "Esperando despliegue en Cloudflare Pages — proyecto «${CF_PROJECT}», commit ${commit_lc:0:7}"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  # La API rechaza per_page alto (p. ej. 50); el máximo habitual es 20.
  row=""
  page=1
  while true; do
    json=$(curl -sS -G "${API}" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      --data-urlencode "page=${page}" \
      --data-urlencode "per_page=20")

    if ! echo "$json" | jq -e '.success == true' >/dev/null 2>&1; then
      err_code=$(echo "$json" | jq -r '.errors[0].code // empty')
      err_msg=$(echo "$json" | jq -r '.errors[0].message // empty')
      echo "::error::API Cloudflare: ${err_msg}"
      echo "$json" | jq .
      if [ "$err_code" = "8000007" ]; then
        echo "::error::El nombre de proyecto «${CF_PROJECT}» no existe en esta cuenta. En Cloudflare: Workers & Pages → copia el nombre del proyecto (slug). En GitHub: Settings → Secrets and variables → Actions → Variables → CLOUDFLARE_PAGES_PROJECT."
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
