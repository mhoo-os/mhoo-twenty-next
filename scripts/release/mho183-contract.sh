#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat >&2 <<'EOF'
Usage:
  mho183-contract.sh --static [--compose-file FILE] [--env-file FILE] [--evidence-dir DIR]
  mho183-contract.sh --env-file FILE [--compose-file FILE] [--project-name NAME] [--evidence-dir DIR]

The default mode resolves a real disposable runtime configuration and fails
closed unless every image is digest-pinned and the closed-beta guardrails are
present. --static is the source/CI contract check and permits the documented
candidate digest placeholder in validation.env.example.
EOF
  exit 2
}

root="$(git rev-parse --show-toplevel)"
compose_file="$root/deploy/twenty-next/compose.yaml"
env_file=""
evidence_dir="/tmp/mho183-evidence"
project_name=""
static=false

while (($#)); do
  case "$1" in
    --static) static=true; shift ;;
    --compose-file) compose_file="$2"; shift 2 ;;
    --env-file) env_file="$2"; shift 2 ;;
    --project-name) project_name="$2"; shift 2 ;;
    --evidence-dir) evidence_dir="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

if [[ -z "$env_file" ]]; then
  if $static; then
    env_file="$root/deploy/twenty-next/env/validation.env.example"
  else
    printf '%s\n' '--env-file is required in dynamic mode' >&2
    usage
  fi
fi

[[ -f "$compose_file" ]] || { printf 'compose file not found\n' >&2; exit 1; }
[[ -f "$env_file" ]] || { printf 'env file not found\n' >&2; exit 1; }
fail() { printf 'MHO-183 runtime contract failed: %s\n' "$1" >&2; exit 1; }
mkdir -p "$evidence_dir"
receipt="$evidence_dir/mho183-contract.json"

if $static; then
  grep -Eq '^POSTGRES_IMAGE=.+@sha256:[0-9a-f]{64}$' "$env_file" || {
    printf '%s\n' 'static contract failed: POSTGRES_IMAGE is not pinned' >&2
    exit 1
  }
  grep -Eq '^REDIS_IMAGE=.+@sha256:[0-9a-f]{64}$' "$env_file" || {
    printf '%s\n' 'static contract failed: REDIS_IMAGE is not pinned' >&2
    exit 1
  }
  grep -Eq '^MAILPIT_IMAGE=.+@sha256:[0-9a-f]{64}$' "$env_file" || {
    printf '%s\n' 'static contract failed: MAILPIT_IMAGE is not pinned' >&2
    exit 1
  }
  grep -Eq '^TWENTY_IMAGE=ghcr\.io/mhoo-os/mhoo-twenty-next@sha256:replace-with-new-digest$' "$env_file" || {
    printf '%s\n' 'static contract failed: candidate placeholder changed unexpectedly' >&2
    exit 1
  }
  grep -Eq '^SERVER_URL=http://127\.0\.0\.1:[0-9]+$' "$env_file" || {
    printf '%s\n' 'static contract failed: SERVER_URL must be loopback' >&2
    exit 1
  }
  grep -Eq '^TWENTY_NEXT_PORT=[0-9]+$' "$env_file" || {
    printf '%s\n' 'static contract failed: Twenty port is invalid' >&2
    exit 1
  }
  grep -Eq '^MAILPIT_PORT=[0-9]+$' "$env_file" || {
    printf '%s\n' 'static contract failed: Mailpit port is invalid' >&2
    exit 1
  }
  grep -Eq '^MHO183_VOLUME_SUFFIX=[A-Za-z0-9][A-Za-z0-9_-]{0,63}$' "$env_file" || {
    printf '%s\n' 'static contract failed: volume suffix is invalid' >&2
    exit 1
  }
  for required in \
    'AUTH_PASSWORD_ENABLED=true' \
    'AUTH_GOOGLE_ENABLED=false' \
    'AUTH_MICROSOFT_ENABLED=false' \
    'IS_MULTIWORKSPACE_ENABLED=false' \
    'IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS=true' \
    'IS_EMAIL_VERIFICATION_REQUIRED=true' \
    'SIGN_IN_PREFILLED=false' \
    'IS_CONFIG_VARIABLES_IN_DB_ENABLED=false' \
    'LOGIC_FUNCTION_TYPE=DISABLED' \
    'CODE_INTERPRETER_TYPE=DISABLED' \
    'STORAGE_TYPE=local' \
    'EMAIL_DRIVER=smtp' \
    'EMAIL_SMTP_HOST=mailpit' \
    'EMAIL_SMTP_PORT=1025' \
    'EMAIL_SMTP_NO_TLS=true'; do
    grep -Fxq "$required" "$env_file" || {
      printf 'static contract failed: missing %s\n' "$required" >&2
      exit 1
    }
  done
  docker compose --env-file "$env_file" -f "$compose_file" config --quiet
  jq -n \
    --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg composeFile "$compose_file" \
    --arg envFile "$env_file" \
    '{status:"PASS", evidenceClass:"source-ci-contract", generatedAt:$generatedAt, composeFile:$composeFile, envFile:$envFile, candidateImage:"placeholder-not-a-runtime-candidate", productionCutover:false}' \
    > "$receipt"
  chmod 600 "$receipt"
  printf 'MHO-183 static contract passed\nreceipt=%s\n' "$receipt"
  exit 0
fi

if [[ -z "$project_name" ]]; then
  project_name="$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$env_file" | head -n 1)"
  project_name="${project_name:-mhoo_twenty_next}"
fi

compose=(docker compose --project-name "$project_name" --env-file "$env_file" -f "$compose_file")
config_json="$("${compose[@]}" config --format json)"

db_volume_name="$(jq -r '.volumes["db-data"].name // empty' <<<"$config_json")"
redis_volume_name="$(jq -r '.volumes["redis-data"].name // empty' <<<"$config_json")"
files_volume_name="$(jq -r '.volumes["server-files"].name // empty' <<<"$config_json")"
for volume_name in "$db_volume_name" "$redis_volume_name" "$files_volume_name"; do
  [[ "$volume_name" =~ ^mhoo_twenty_next_(db|redis|files)_[A-Za-z0-9][A-Za-z0-9_-]{0,63}$ ]] || fail 'MHO183 volumes must use a safe unique suffix'
done
volume_suffix="${db_volume_name#mhoo_twenty_next_db_}"
[[ "${redis_volume_name#mhoo_twenty_next_redis_}" == "$volume_suffix" && "${files_volume_name#mhoo_twenty_next_files_}" == "$volume_suffix" ]] || fail 'MHO183 volumes must share one suffix'
[[ "$volume_suffix" != validation ]] || fail 'MHO183 volume suffix must be changed from the example value'

for service in db redis mailpit server worker; do
  image="$(jq -r --arg service "$service" '.services[$service].image // empty' <<<"$config_json")"
  [[ "$image" =~ @sha256:[0-9a-fA-F]{64}$ ]] || fail "$service image is not digest-pinned"
done

server_image="$(jq -r '.services.server.image' <<<"$config_json")"
worker_image="$(jq -r '.services.worker.image' <<<"$config_json")"
[[ "$server_image" =~ ^ghcr\.io/mhoo-os/mhoo-twenty-next@sha256:[0-9a-fA-F]{64}$ ]] || fail 'candidate image must be the Mhoo GHCR digest'
[[ "$server_image" == "$worker_image" ]] || fail 'server and worker candidate images differ'

for check in \
  '.services.server.environment.AUTH_PASSWORD_ENABLED | tostring == "true"' \
  '.services.server.environment.AUTH_GOOGLE_ENABLED | tostring == "false"' \
  '.services.server.environment.AUTH_MICROSOFT_ENABLED | tostring == "false"' \
  '.services.server.environment.IS_MULTIWORKSPACE_ENABLED | tostring == "false"' \
  '.services.server.environment.IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS | tostring == "true"' \
  '.services.server.environment.IS_EMAIL_VERIFICATION_REQUIRED | tostring == "true"' \
  '.services.server.environment.SIGN_IN_PREFILLED | tostring == "false"' \
  '.services.server.environment.IS_CONFIG_VARIABLES_IN_DB_ENABLED | tostring == "false"' \
  '.services.server.environment.LOGIC_FUNCTION_TYPE | tostring == "DISABLED"' \
  '.services.server.environment.CODE_INTERPRETER_TYPE | tostring == "DISABLED"' \
  '.services.server.environment.STORAGE_TYPE | tostring == "local"' \
  '.services.server.environment.EMAIL_DRIVER | tostring == "smtp"' \
  '.services.server.environment.EMAIL_SMTP_HOST | tostring == "mailpit"' \
  '.services.server.environment.EMAIL_SMTP_PORT | tostring == "1025"' \
  '.services.server.environment.EMAIL_SMTP_NO_TLS | tostring == "true"' \
  '.services.server.environment.SERVER_URL | startswith("http://127.0.0.1:")' \
  'all(.services.server.ports[]?; .host_ip == "127.0.0.1")' \
  'all(.services.mailpit.ports[]?; .host_ip == "127.0.0.1")' \
  '((.services.db.ports // []) | length == 0)' \
  '((.services.redis.ports // []) | length == 0)'; do
  jq -e "$check" <<<"$config_json" >/dev/null || fail "configuration assertion failed: $check"
done

redacted_config="$(jq -S 'del(.services[].environment.PG_DATABASE_URL, .services[].environment.ENCRYPTION_KEY)' <<<"$config_json")"
config_sha256="$(printf '%s' "$redacted_config" | sha256sum | awk '{print $1}')"
postgres_image="$(jq -r '.services.db.image' <<<"$config_json")"
redis_image="$(jq -r '.services.redis.image' <<<"$config_json")"
mailpit_image="$(jq -r '.services.mailpit.image' <<<"$config_json")"

jq -n \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg composeFile "$compose_file" \
  --arg envFile "$env_file" \
  --arg projectName "$project_name" \
  --arg candidateImage "$server_image" \
  --arg postgresImage "$postgres_image" \
  --arg redisImage "$redis_image" \
  --arg mailpitImage "$mailpit_image" \
  --arg configSha256 "$config_sha256" \
  '{status:"PASS", evidenceClass:"bounded-runtime-contract", generatedAt:$generatedAt, composeFile:$composeFile, envFile:$envFile, projectName:$projectName, candidateImage:$candidateImage, dependencyImages:{postgres:$postgresImage,redis:$redisImage,mailpit:$mailpitImage}, redactedConfigSha256:$configSha256, productionCutover:false}' \
  > "$receipt"
chmod 600 "$receipt"

printf 'MHO-183 runtime contract passed\nredactedConfigSha256=%s\nreceipt=%s\n' "$config_sha256" "$receipt"
