#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: mho183-monitor.sh --env-file FILE --base-url URL --mailpit-url URL
                          [--compose-file FILE] [--project-name NAME]
                          [--evidence-dir DIR] [--receipt-name NAME]

Exit status is 0 when all bounded-runtime checks pass and 1 when an alert
condition is observed. The receipt is safe to retain: it contains states and
URLs only, never environment values or tokens.
EOF
  exit 2
}

root="$(git rev-parse --show-toplevel)"
compose_file="$root/deploy/twenty-next/compose.yaml"
env_file=""
project_name=""
base_url=""
mailpit_url=""
evidence_dir="/tmp/mho183-evidence"
receipt_name="mho183-monitor.json"

while (($#)); do
  case "$1" in
    --compose-file) compose_file="$2"; shift 2 ;;
    --env-file) env_file="$2"; shift 2 ;;
    --project-name) project_name="$2"; shift 2 ;;
    --base-url) base_url="$2"; shift 2 ;;
    --mailpit-url) mailpit_url="$2"; shift 2 ;;
    --evidence-dir) evidence_dir="$2"; shift 2 ;;
    --receipt-name) receipt_name="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

[[ -f "$compose_file" ]] || { printf 'compose file not found\n' >&2; exit 2; }
[[ -f "$env_file" ]] || { printf 'env file not found\n' >&2; exit 2; }
[[ -n "$base_url" && -n "$mailpit_url" ]] || usage
project_name="${project_name:-$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$env_file" | head -n 1)}"
project_name="${project_name:-mhoo_twenty_next}"
mkdir -p "$evidence_dir"
receipt="$evidence_dir/$receipt_name"
compose=(docker compose --project-name "$project_name" --env-file "$env_file" -f "$compose_file")
failures=()

check_container() {
  local service="$1"
  local id state health exit_code
  id="$("${compose[@]}" ps -q "$service" 2>/dev/null || true)"
  if [[ -z "$id" ]]; then
    failures+=("$service:container_missing")
    return
  fi
  IFS='|' read -r state health exit_code < <(
    docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.State.ExitCode}}' "$id"
  )
  [[ "$state" == running ]] || failures+=("$service:state_$state")
  case "$service" in
    db|redis|server|worker) [[ "$health" == healthy ]] || failures+=("$service:health_$health") ;;
  esac
  [[ "$exit_code" == 0 || "$state" == running ]] || failures+=("$service:exit_$exit_code")
}

for service in db redis mailpit server worker; do
  check_container "$service"
done

if ! curl --fail --silent --show-error --max-time 10 "$base_url/healthz" >/dev/null 2>&1; then
  failures+=("server:http_healthz")
fi
if ! curl --fail --silent --show-error --max-time 10 "$mailpit_url/api/v1/messages" >/dev/null 2>&1; then
  failures+=("mailpit:http_api")
fi
redis_id="$("${compose[@]}" ps -q redis 2>/dev/null || true)"
if [[ -z "$redis_id" ]] || [[ "$(docker exec "$redis_id" redis-cli ping 2>/dev/null || true)" != PONG ]]; then
  failures+=("redis:ping")
fi

if ((${#failures[@]} == 0)); then
  status=healthy
else
  status=alert
fi
failures_json="$(printf '%s\n' "${failures[@]}" | jq -Rsc 'split("\n") | map(select(length > 0))')"
jq -n \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg status "$status" \
  --arg projectName "$project_name" \
  --arg baseUrl "$base_url" \
  --arg mailpitUrl "$mailpit_url" \
  --argjson failures "$failures_json" \
  '{status:$status, evidenceClass:"bounded-runtime-monitor", generatedAt:$generatedAt, projectName:$projectName, endpoints:{base:$baseUrl,mailpit:$mailpitUrl}, failures:$failures, productionCutover:false}' \
  > "$receipt"
chmod 600 "$receipt"

printf 'MHO-183 monitor status=%s failures=%s receipt=%s\n' "$status" "${#failures[@]}" "$receipt"
if [[ "$status" == alert ]]; then
  exit 1
fi
