#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: mho183-backup.sh --env-file FILE [--compose-file FILE]
                         [--project-name NAME] [--evidence-dir DIR]

Creates a local synthetic validation backup from the running disposable
Postgres service. It deliberately does not claim encrypted off-host custody.
EOF
  exit 2
}

root="$(git rev-parse --show-toplevel)"
compose_file="$root/deploy/twenty-next/compose.yaml"
env_file=""
project_name=""
evidence_dir="/tmp/mho183-evidence"

while (($#)); do
  case "$1" in
    --compose-file) compose_file="$2"; shift 2 ;;
    --env-file) env_file="$2"; shift 2 ;;
    --project-name) project_name="$2"; shift 2 ;;
    --evidence-dir) evidence_dir="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

[[ -f "$compose_file" ]] || { printf 'compose file not found\n' >&2; exit 2; }
[[ -f "$env_file" ]] || { printf 'env file not found\n' >&2; exit 2; }
project_name="${project_name:-$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$env_file" | head -n 1)}"
project_name="${project_name:-mhoo_twenty_next}"
mkdir -p "$evidence_dir"
compose=(docker compose --project-name "$project_name" --env-file "$env_file" -f "$compose_file")
contract_script="$root/scripts/release/mho183-contract.sh"
"$contract_script" \
  --compose-file "$compose_file" \
  --env-file "$env_file" \
  --project-name "$project_name" \
  --evidence-dir "$evidence_dir" >/dev/null
config_json="$("${compose[@]}" config --format json)"
pg_user="$(jq -r '.services.db.environment.POSTGRES_USER' <<<"$config_json")"
pg_db="$(jq -r '.services.db.environment.POSTGRES_DB' <<<"$config_json")"
db_image="$(jq -r '.services.db.image' <<<"$config_json")"
[[ "$db_image" =~ @sha256:[0-9a-fA-F]{64}$ ]] || { printf 'database image is not digest-pinned\n' >&2; exit 1; }
files_volume="$(jq -r '.volumes["server-files"].name // empty' <<<"$config_json")"
redis_volume="$(jq -r '.volumes["redis-data"].name // empty' <<<"$config_json")"
[[ -n "$files_volume" && -n "$redis_volume" ]] || { printf 'Files or Redis volume is not defined\n' >&2; exit 1; }
docker volume inspect "$files_volume" >/dev/null
docker volume inspect "$redis_volume" >/dev/null

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$evidence_dir/mho183-postgres-$timestamp.dump"
files_backup="$evidence_dir/mho183-files-$timestamp.tar.gz"
redis_backup="$evidence_dir/mho183-redis-$timestamp.tar.gz"
receipt="$evidence_dir/mho183-backup-$timestamp.json"

"${compose[@]}" exec -T db pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --username "$pg_user" \
  --dbname "$pg_db" \
  > "$backup_file"
chmod 600 "$backup_file"
[[ -s "$backup_file" ]] || { printf 'backup file is empty\n' >&2; exit 1; }
docker run --rm --network none --mount "type=bind,src=$evidence_dir,dst=/evidence,readonly" "$db_image" \
  pg_restore --list "/evidence/$(basename "$backup_file")" >/dev/null

for volume_spec in \
  "$files_volume|$files_backup" \
  "$redis_volume|$redis_backup"; do
  volume="${volume_spec%%|*}"
  archive="${volume_spec#*|}"
  docker run --rm --network none \
    --user 0:0 \
    --mount "type=volume,source=$volume,target=/source,readonly" \
    --mount "type=bind,src=$evidence_dir,dst=/evidence" \
    "$db_image" sh -c 'tar -C /source -czf "/evidence/$1" .' sh "$(basename "$archive")"
  chmod 600 "$archive"
  [[ -s "$archive" ]] || { printf 'volume backup is empty: %s\n' "$volume" >&2; exit 1; }
  docker run --rm --network none --mount "type=bind,src=$evidence_dir,dst=/evidence,readonly" "$db_image" \
    tar -tzf "/evidence/$(basename "$archive")" >/dev/null
done

backup_sha256="$(sha256sum "$backup_file" | awk '{print $1}')"
backup_bytes="$(wc -c < "$backup_file" | tr -d ' ' )"
files_sha256="$(sha256sum "$files_backup" | awk '{print $1}')"
files_bytes="$(wc -c < "$files_backup" | tr -d ' ' )"
redis_sha256="$(sha256sum "$redis_backup" | awk '{print $1}')"
redis_bytes="$(wc -c < "$redis_backup" | tr -d ' ' )"

jq -n \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg projectName "$project_name" \
  --arg databaseImage "$db_image" \
  --arg database "$pg_db" \
  --arg file "$backup_file" \
  --arg sha256 "$backup_sha256" \
  --arg bytes "$backup_bytes" \
  --arg filesVolume "$files_volume" \
  --arg filesBackup "$files_backup" \
  --arg filesSha256 "$files_sha256" \
  --arg filesBytes "$files_bytes" \
  --arg redisVolume "$redis_volume" \
  --arg redisBackup "$redis_backup" \
  --arg redisSha256 "$redis_sha256" \
  --arg redisBytes "$redis_bytes" \
  '{status:"PASS", evidenceClass:"bounded-runtime-backup", generatedAt:$generatedAt, projectName:$projectName, databaseImage:$databaseImage, database:$database, backupFile:$file, backupSha256:$sha256, backupBytes:($bytes|tonumber), files:{volume:$filesVolume,backupFile:$filesBackup,backupSha256:$filesSha256,backupBytes:($filesBytes|tonumber)}, redis:{volume:$redisVolume,backupFile:$redisBackup,backupSha256:$redisSha256,backupBytes:($redisBytes|tonumber)}, custody:"local-validation-only", encryptedOffHost:false, productionCutover:false}' \
  > "$receipt"
chmod 600 "$receipt"

printf 'MHO-183 backup passed\ndatabaseBackupSha256=%s\nfilesBackup=%s\nredisBackup=%s\nreceipt=%s\n' "$backup_sha256" "$files_backup" "$redis_backup" "$receipt"
