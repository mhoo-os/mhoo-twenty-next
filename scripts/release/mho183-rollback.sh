#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: mho183-rollback.sh --env-file FILE --candidate-image IMAGE
                           --prior-image IMAGE --prior-config-sha256 SHA256
                           --allow-schema-compatible
                           --base-url URL --mailpit-url URL
                           [--compose-file FILE] [--project-name NAME]
                           [--evidence-dir DIR]

Recreates only the server and worker from a known prior immutable image using
the existing disposable volumes. The schema flag is deliberately explicit:
this command never attempts a destructive database downgrade or removes data.
EOF
  exit 2
}

root="$(git rev-parse --show-toplevel)"
compose_file="$root/deploy/twenty-next/compose.yaml"
env_file=""
project_name=""
candidate_image=""
prior_image=""
prior_config_sha256=""
base_url=""
mailpit_url=""
evidence_dir="/tmp/mho183-evidence"
allow_schema_compatible=false

while (($#)); do
  case "$1" in
    --compose-file) compose_file="$2"; shift 2 ;;
    --env-file) env_file="$2"; shift 2 ;;
    --project-name) project_name="$2"; shift 2 ;;
    --candidate-image) candidate_image="$2"; shift 2 ;;
    --prior-image) prior_image="$2"; shift 2 ;;
    --prior-config-sha256) prior_config_sha256="$2"; shift 2 ;;
    --allow-schema-compatible) allow_schema_compatible=true; shift ;;
    --base-url) base_url="$2"; shift 2 ;;
    --mailpit-url) mailpit_url="$2"; shift 2 ;;
    --evidence-dir) evidence_dir="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

[[ -f "$compose_file" ]] || { printf 'compose file not found\n' >&2; exit 2; }
[[ -f "$env_file" ]] || { printf 'env file not found\n' >&2; exit 2; }
[[ "$candidate_image" =~ ^ghcr\.io/mhoo-os/mhoo-twenty-next@sha256:[0-9a-fA-F]{64}$ ]] || { printf 'candidate image must be the Mhoo GHCR digest\n' >&2; exit 1; }
[[ "$prior_image" =~ ^ghcr\.io/mhoo-os/mhoo-twenty-next@sha256:[0-9a-fA-F]{64}$ ]] || { printf 'prior image must be the Mhoo GHCR digest\n' >&2; exit 1; }
[[ "$prior_config_sha256" =~ ^[0-9a-fA-F]{64}$ ]] || { printf 'prior config hash is invalid\n' >&2; exit 1; }
[[ -n "$base_url" && -n "$mailpit_url" ]] || usage
$allow_schema_compatible || {
  printf '%s\n' 'rollback requires explicit --allow-schema-compatible (no schema downgrade is attempted)' >&2
  exit 1
}

project_name="${project_name:-$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$env_file" | head -n 1)}"
project_name="${project_name:-mhoo_twenty_next}"
mkdir -p "$evidence_dir"
compose=(docker compose --project-name "$project_name" --env-file "$env_file" -f "$compose_file")
contract_script="$root/scripts/release/mho183-contract.sh"
TWENTY_IMAGE="$candidate_image" "$contract_script" \
  --compose-file "$compose_file" \
  --env-file "$env_file" \
  --project-name "$project_name" \
  --evidence-dir "$evidence_dir" >/dev/null

candidate_config="$(TWENTY_IMAGE="$candidate_image" "${compose[@]}" config --format json)"
current_image="$(jq -r '.services.server.image' <<<"$candidate_config")"
[[ "$current_image" == "$candidate_image" ]] || {
  printf 'current candidate does not match --candidate-image\n' >&2
  exit 1
}
for service in server worker; do
  current_id="$("${compose[@]}" ps -q "$service")"
  [[ -n "$current_id" ]] || { printf 'rollback source service is missing: %s\n' "$service" >&2; exit 1; }
  current_state="$(docker inspect --format '{{.State.Status}}' "$current_id")"
  current_runtime_image="$(docker inspect --format '{{.Config.Image}}' "$current_id")"
  [[ "$current_state" == running && "$current_runtime_image" == "$candidate_image" ]] || {
    printf 'rollback source is not the running candidate for %s\n' "$service" >&2
    exit 1
  }
done

prior_config="$(TWENTY_IMAGE="$prior_image" "${compose[@]}" config --format json)"
prior_redacted_config="$(jq -S 'del(.services[].environment.PG_DATABASE_URL, .services[].environment.ENCRYPTION_KEY)' <<<"$prior_config")"
computed_prior_config_sha256="$(printf '%s' "$prior_redacted_config" | sha256sum | awk '{print $1}')"
[[ "$computed_prior_config_sha256" == "$prior_config_sha256" ]] || {
  printf 'prior configuration hash does not match --prior-config-sha256\n' >&2
  exit 1
}

"${compose[@]}" config --quiet
TWENTY_IMAGE="$prior_image" "${compose[@]}" up -d --wait --wait-timeout 300 >/dev/null
server_id="$("${compose[@]}" ps -q server)"
worker_id="$("${compose[@]}" ps -q worker)"
[[ -n "$server_id" && -n "$worker_id" ]] || { printf 'rollback did not produce both containers\n' >&2; exit 1; }
server_runtime_image="$(docker inspect --format '{{.Config.Image}}' "$server_id")"
worker_runtime_image="$(docker inspect --format '{{.Config.Image}}' "$worker_id")"
[[ "$server_runtime_image" == "$prior_image" ]] || { printf 'server is not running the prior digest\n' >&2; exit 1; }
[[ "$worker_runtime_image" == "$prior_image" ]] || { printf 'worker is not running the prior digest\n' >&2; exit 1; }

monitor_script="$root/scripts/release/mho183-monitor.sh"
"$monitor_script" \
  --compose-file "$compose_file" \
  --env-file "$env_file" \
  --project-name "$project_name" \
  --base-url "$base_url" \
  --mailpit-url "$mailpit_url" \
  --evidence-dir "$evidence_dir" \
  --receipt-name mho183-rollback-monitor.json >/dev/null

receipt="$evidence_dir/mho183-rollback.json"
jq -n \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg projectName "$project_name" \
  --arg candidateImage "$candidate_image" \
  --arg priorImage "$prior_image" \
  --arg priorConfigSha256 "$prior_config_sha256" \
  --arg serverImage "$server_runtime_image" \
  --arg workerImage "$worker_runtime_image" \
  '{status:"PASS", evidenceClass:"bounded-runtime-rollback", generatedAt:$generatedAt, projectName:$projectName, candidateImage:$candidateImage, priorImage:$priorImage, priorConfigSha256:$priorConfigSha256, serverRuntimeImage:$serverImage, workerRuntimeImage:$workerImage, volumesRemoved:false, schemaDowngradeAttempted:false, postRollbackMonitor:true, productionCutover:false}' \
  > "$receipt"
chmod 600 "$receipt"

printf 'MHO-183 rollback passed\npriorImage=%s\nreceipt=%s\n' "$prior_image" "$receipt"
