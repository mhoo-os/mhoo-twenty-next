#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: mho183-start.sh --env-file FILE --base-url URL --mailpit-url URL
                         [--compose-file FILE] [--project-name NAME]
                         [--evidence-dir DIR]

Starts the disposable candidate, waits for server and worker health, and
records the migration and cron-registration success markers from the server
entrypoint. It does not publish or cut over anything.
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

while (($#)); do
  case "$1" in
    --compose-file) compose_file="$2"; shift 2 ;;
    --env-file) env_file="$2"; shift 2 ;;
    --project-name) project_name="$2"; shift 2 ;;
    --base-url) base_url="$2"; shift 2 ;;
    --mailpit-url) mailpit_url="$2"; shift 2 ;;
    --evidence-dir) evidence_dir="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

[[ -f "$compose_file" ]] || { printf 'compose file not found\n' >&2; exit 2; }
[[ -f "$env_file" ]] || { printf 'env file not found\n' >&2; exit 2; }
[[ -n "$base_url" && -n "$mailpit_url" ]] || usage
if [[ -z "$project_name" ]]; then
  project_name="$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$env_file" | head -n 1)"
fi
if [[ -z "$project_name" ]]; then
  project_name="mhoo_twenty_next"
fi
mkdir -p "$evidence_dir"
compose=(docker compose --project-name "$project_name" --env-file "$env_file" -f "$compose_file")

contract_script="$root/scripts/release/mho183-contract.sh"
"$contract_script" \
  --compose-file "$compose_file" \
  --env-file "$env_file" \
  --project-name "$project_name" \
  --evidence-dir "$evidence_dir" >/dev/null

"${compose[@]}" config --quiet
"${compose[@]}" up -d --wait --wait-timeout 300 >/dev/null

config_json="$("${compose[@]}" config --format json)"
candidate_image="$(jq -r '.services.server.image' <<<"$config_json")"
for service in server worker; do
  service_id="$("${compose[@]}" ps -q "$service")"
  [[ -n "$service_id" ]] || { printf 'candidate service is missing: %s\n' "$service" >&2; exit 1; }
  runtime_image="$(docker inspect --format '{{.Config.Image}}' "$service_id")"
  [[ "$runtime_image" == "$candidate_image" ]] || {
    printf 'candidate image mismatch for %s\n' "$service" >&2
    exit 1
  }
done

server_logs="$("${compose[@]}" logs --no-color --tail=300 server 2>&1)"
grep -Fq 'Successfully migrated DB!' <<<"$server_logs" || {
  printf '%s\n' 'server logs did not prove successful migrations' >&2
  exit 1
}
grep -Fq 'Successfully registered all background sync jobs!' <<<"$server_logs" || {
  printf '%s\n' 'server logs did not prove background job registration' >&2
  exit 1
}

monitor_script="$root/scripts/release/mho183-monitor.sh"
"$monitor_script" \
  --compose-file "$compose_file" \
  --env-file "$env_file" \
  --project-name "$project_name" \
  --base-url "$base_url" \
  --mailpit-url "$mailpit_url" \
  --evidence-dir "$evidence_dir" \
  --receipt-name mho183-start-monitor.json >/dev/null

receipt="$evidence_dir/mho183-start.json"
jq -n \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg projectName "$project_name" \
  --arg candidateImage "$candidate_image" \
  '{status:"PASS", evidenceClass:"bounded-runtime-startup", generatedAt:$generatedAt, projectName:$projectName, candidateImage:$candidateImage, migrations:"Successfully migrated DB!", backgroundJobs:"Successfully registered all background sync jobs!", workerHealthChecked:true, productionCutover:false}' \
  > "$receipt"
chmod 600 "$receipt"

printf 'MHO-183 startup passed\ncandidateImage=%s\nreceipt=%s\n' "$candidate_image" "$receipt"
