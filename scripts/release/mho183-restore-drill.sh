#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: mho183-restore-drill.sh --env-file FILE --backup-file FILE
                               --files-backup FILE --redis-backup FILE
                               [--compose-file FILE] [--project-name NAME]
                               [--evidence-dir DIR]

Restores synthetic validation DB, Files, and Redis backups into fresh
network-none volumes, verifies the core schema and volume contents, then
removes the temporary containers and volumes.
EOF
  exit 2
}

root="$(git rev-parse --show-toplevel)"
compose_file="$root/deploy/twenty-next/compose.yaml"
env_file=""
backup_file=""
files_backup=""
redis_backup=""
project_name=""
evidence_dir="/tmp/mho183-evidence"

while (($#)); do
  case "$1" in
    --compose-file) compose_file="$2"; shift 2 ;;
    --env-file) env_file="$2"; shift 2 ;;
    --backup-file) backup_file="$2"; shift 2 ;;
    --files-backup) files_backup="$2"; shift 2 ;;
    --redis-backup) redis_backup="$2"; shift 2 ;;
    --project-name) project_name="$2"; shift 2 ;;
    --evidence-dir) evidence_dir="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

[[ -f "$compose_file" ]] || { printf 'compose file not found\n' >&2; exit 2; }
[[ -f "$env_file" ]] || { printf 'env file not found\n' >&2; exit 2; }
[[ -f "$backup_file" ]] || { printf 'backup file not found\n' >&2; exit 2; }
[[ -s "$backup_file" ]] || { printf 'backup file is empty\n' >&2; exit 2; }
[[ -f "$files_backup" ]] || { printf 'Files backup file not found\n' >&2; exit 2; }
[[ -s "$files_backup" ]] || { printf 'Files backup file is empty\n' >&2; exit 2; }
[[ -f "$redis_backup" ]] || { printf 'Redis backup file not found\n' >&2; exit 2; }
[[ -s "$redis_backup" ]] || { printf 'Redis backup file is empty\n' >&2; exit 2; }
backup_dir="$(cd "$(dirname "$backup_file")" && pwd)"
[[ "$(cd "$(dirname "$files_backup")" && pwd)" == "$backup_dir" ]] || { printf 'backup files must share one evidence directory\n' >&2; exit 2; }
[[ "$(cd "$(dirname "$redis_backup")" && pwd)" == "$backup_dir" ]] || { printf 'backup files must share one evidence directory\n' >&2; exit 2; }
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
redis_image="$(jq -r '.services.redis.image' <<<"$config_json")"
[[ "$redis_image" =~ @sha256:[0-9a-fA-F]{64}$ ]] || { printf 'Redis image is not digest-pinned\n' >&2; exit 1; }

restore_id="mho183-restore-$(date -u +%Y%m%d%H%M%S)-$$"
restore_volume="${restore_id}-data"
files_restore_volume="${restore_id}-files"
redis_restore_volume="${restore_id}-redis"
redis_restore_id="${restore_id}-redis-container"
receipt="$evidence_dir/${restore_id}.json"
cleanup() {
  docker rm -f "$restore_id" >/dev/null 2>&1 || true
  docker rm -f "$redis_restore_id" >/dev/null 2>&1 || true
  docker volume rm "$restore_volume" "$files_restore_volume" "$redis_restore_volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker volume create "$restore_volume" >/dev/null
docker volume create "$files_restore_volume" >/dev/null
docker volume create "$redis_restore_volume" >/dev/null

restore_archive() {
  local archive="$1"
  local volume="$2"
  local target="$3"
  docker run --rm --network none \
    --user 0:0 \
    --mount "type=volume,source=$volume,target=$target" \
    --mount "type=bind,src=$backup_dir,dst=/evidence,readonly" \
    "$db_image" sh -c 'tar -xzf "/evidence/$1" -C "$2"' sh "$(basename "$archive")" "$target"
}

restore_archive "$files_backup" "$files_restore_volume" /restore-files
restore_archive "$redis_backup" "$redis_restore_volume" /restore-redis
docker run --detach \
  --name "$restore_id" \
  --network none \
  --mount "type=volume,source=$restore_volume,target=/var/lib/postgresql/data" \
  --env POSTGRES_USER="$pg_user" \
  --env POSTGRES_PASSWORD=restore-only \
  --env POSTGRES_DB="$pg_db" \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  "$db_image" >/dev/null

ready=false
for _ in {1..60}; do
  if docker exec "$restore_id" pg_isready -U "$pg_user" -d "$pg_db" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done
$ready || { printf 'fresh restore database did not become ready\n' >&2; exit 1; }

docker exec -i "$restore_id" pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --username "$pg_user" \
  --dbname "$pg_db" \
  < "$backup_file"
table_count="$(docker exec "$restore_id" psql -Atqc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'core'" -U "$pg_user" -d "$pg_db")"
[[ "$table_count" =~ ^[0-9]+$ && "$table_count" -gt 0 ]] || {
  printf 'restored database has no core tables\n' >&2
  exit 1
}

files_entry_count="$(docker run --rm --network none --mount "type=bind,src=$backup_dir,dst=/evidence,readonly" "$db_image" sh -c 'tar -tzf "/evidence/$1" | sed "/\/$/d" | wc -l' sh "$(basename "$files_backup")" | tr -d ' ')"
files_restored_count="$(docker run --rm --network none --mount "type=volume,source=$files_restore_volume,target=/restore-files,readonly" "$db_image" sh -c 'find /restore-files -type f -print | wc -l' | tr -d ' ')"
[[ "$files_entry_count" =~ ^[0-9]+$ && "$files_entry_count" == "$files_restored_count" ]] || {
  printf 'restored Files volume entry count differed from archive\n' >&2
  exit 1
}

docker run --detach \
  --name "$redis_restore_id" \
  --network none \
  --mount "type=volume,source=$redis_restore_volume,target=/data" \
  "$redis_image" redis-server --appendonly yes --save '' >/dev/null
redis_ready=false
for _ in {1..30}; do
  if docker exec "$redis_restore_id" redis-cli ping 2>/dev/null | grep -Fxq PONG; then
    redis_ready=true
    break
  fi
  sleep 1
done
$redis_ready || { printf 'restored Redis volume did not become ready\n' >&2; exit 1; }

backup_sha256="$(sha256sum "$backup_file" | awk '{print $1}')"
files_sha256="$(sha256sum "$files_backup" | awk '{print $1}')"
redis_sha256="$(sha256sum "$redis_backup" | awk '{print $1}')"
jq -n \
  --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg projectName "$project_name" \
  --arg restoreImage "$db_image" \
  --arg database "$pg_db" \
  --arg backupFile "$backup_file" \
  --arg backupSha256 "$backup_sha256" \
  --arg tableCount "$table_count" \
  --arg filesBackup "$files_backup" \
  --arg filesSha256 "$files_sha256" \
  --arg filesEntryCount "$files_entry_count" \
  --arg filesRestoredCount "$files_restored_count" \
  --arg redisImage "$redis_image" \
  --arg redisBackup "$redis_backup" \
  --arg redisSha256 "$redis_sha256" \
  --arg network "none" \
  '{status:"PASS", evidenceClass:"bounded-runtime-restore", generatedAt:$generatedAt, projectName:$projectName, restoreImage:$restoreImage, database:$database, backupFile:$backupFile, backupSha256:$backupSha256, restoredCoreTableCount:($tableCount|tonumber), files:{backupFile:$filesBackup,backupSha256:$filesSha256,archiveEntries:($filesEntryCount|tonumber),restoredEntries:($filesRestoredCount|tonumber)}, redis:{image:$redisImage,backupFile:$redisBackup,backupSha256:$redisSha256,ping:"PONG"}, networkIsolation:$network, temporaryVolumeRemoved:true, productionCutover:false}' \
  > "$receipt"
chmod 600 "$receipt"

printf 'MHO-183 restore drill passed\ndatabaseBackupSha256=%s\nfilesBackupSha256=%s\nredisBackupSha256=%s\nreceipt=%s\n' "$backup_sha256" "$files_sha256" "$redis_sha256" "$receipt"
