#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: mho183-recreate.sh --env-file FILE --candidate-image IMAGE
                          --base-url URL --mailpit-url URL
                          [--compose-file FILE] [--project-name NAME]
                          [--evidence-dir DIR]

Stops and recreates the disposable Compose services without removing their
named DB, Redis, or Files volumes, then requires a fresh healthy monitor
receipt. This is a local recovery rehearsal, not a production restart.
EOF
  exit 2
}

root="$(git rev-parse --show-toplevel)"
compose_file="$root/deploy/twenty-next/compose.yaml"
env_file=""
candidate_image=""
project_name=""
base_url=""
mailpit_url=""
evidence_dir="/tmp/mho183-evidence"

while (($#)); do
  case "$1" in
    --compose-file) compose_file="$2"; shift 2 ;;
    --env-file) env_file="$2"; shift 2 ;;
    --candidate-image) candidate_image="$2"; shift 2 ;;
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
[[ "$candidate_image" =~ @sha256:[0-9a-fA-F]{64}$ ]] || { printf 'candidate image is not digest-pinned\n' >&2; exit 1; }
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
TWENTY_IMAGE="$candidate_image" "$contract_script" \
  --compose-file "$compose_file" \
  --env-file "$env_file" \
  --project-name "$project_name" \
  --evidence-dir "$evidence_dir" >/dev/null
config_json="$(TWENTY_IMAGE="$candidate_image" "${compose[@]}" config --format json)"

declare -A volume_ids_before=()
declare -A volume_ids_after=()
for logical_name in db-data redis-data server-files; do
  volume_name="$(jq -r --arg name "$logical_name" '.volumes[$name].name' <<<"$config_json")"
  volume_ids_before["$logical_name"]="$(docker volume inspect --format '{{.Name}}' "$volume_name")"
done

TWENTY_IMAGE="$candidate_image" "${compose[@]}" down --remove-orphans >/dev/null
TWENTY_IMAGE="$candidate_image" "${compose[@]}" up -d --wait --wait-timeout 300 >/dev/null

for service in server worker; do
  service_id="$("${compose[@]}" ps -q "$service")"
  [[ -n "$service_id" ]] || { printf 'recreated candidate service is missing: %s\n' "$service" >&2; exit 1; }
  runtime_image="$(docker inspect --format '{{.Config.Image}}' "$service_id")"
  [[ "$runtime_image" == "$candidate_image" ]] || {
    printf 'recreated candidate image mismatch for %s\n' "$service" >&2
    exit 1
  }
done

monitor_script="$root/scripts/release/mho183-monitor.sh"
"$monitor_script" \
  --compose-file "$compose_file" \
  --env-file "$env_file" \
  --project-name "$project_name" \
  --base-url "$base_url" \
  --mailpit-url "$mailpit_url" \
  --evidence-dir "$evidence_dir" \
  --receipt-name mho183-recreate-monitor.json >/dev/null

for logical_name in db-data redis-data server-files; do
  volume_name="$(jq -r --arg name "$logical_name" '.volumes[$name].name' <<<"$config_json")"
  volume_ids_after["$logical_name"]="$(docker volume inspect --format '{{.Name}}' "$volume_name")"
  [[ "${volume_ids_before[$logical_name]}" == "${volume_ids_after[$logical_name]}" ]] || {
    printf 'volume identity changed during recreate: %s\n' "$logical_name" >&2
    exit 1
  }
done

receipt="$evidence_dir/mho183-recreate.json"
jq -n \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg projectName "$project_name" \
  --arg candidateImage "$candidate_image" \
  --arg dbBefore "${volume_ids_before[db-data]}" \
  --arg dbAfter "${volume_ids_after[db-data]}" \
  --arg redisBefore "${volume_ids_before[redis-data]}" \
  --arg redisAfter "${volume_ids_after[redis-data]}" \
  --arg filesBefore "${volume_ids_before[server-files]}" \
  --arg filesAfter "${volume_ids_after[server-files]}" \
  '{status:"PASS", evidenceClass:"bounded-runtime-recreate", generatedAt:$generatedAt, projectName:$projectName, candidateImage:$candidateImage, volumes:{db:{before:$dbBefore,after:$dbAfter},redis:{before:$redisBefore,after:$redisAfter},files:{before:$filesBefore,after:$filesAfter}}, volumesRemoved:false, productionCutover:false}' \
  > "$receipt"
chmod 600 "$receipt"

printf 'MHO-183 recreate passed\ncandidateImage=%s\nreceipt=%s\n' "$candidate_image" "$receipt"
