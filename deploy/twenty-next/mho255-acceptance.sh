#!/usr/bin/env bash
# Never source an environment file or reuse a serving Compose project.
set -euo pipefail
umask 077
if [ "$#" -ne 4 ]; then
  echo "Usage: $0 ghcr.io/owner/image@sha256:DIGEST EXPECTED_APP_VERSION EXPECTED_SOURCE_SHA OUTPUT_DIR" >&2
  exit 2
fi
export MHO255_IMAGE=$1
expected_version=$2
expected_sha=$3
[[ "$MHO255_IMAGE" =~ ^ghcr\.io/[a-zA-Z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || { echo 'Immutable GHCR digest required' >&2; exit 2; }
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Full source SHA required' >&2; exit 2; }
for tool in docker python3 openssl; do command -v "$tool" >/dev/null; done
docker compose version >/dev/null
mkdir -p "$4"
out=$(cd "$4" && pwd)
[ ! -e "$out/result.txt" ] || { echo 'Use a new evidence directory' >&2; exit 2; }
compose_file="$(cd "$(dirname "$0")" && pwd)/mho255-compose.yaml"
run_id="mho255-$(date -u +%Y%m%d%H%M%S)-$(openssl rand -hex 5)"
project="$run_id-fresh"
export MHO255_ENCRYPTION_KEY=$(openssl rand -base64 32)
export MHO255_APP_SECRET=$(openssl rand -hex 32)
dc() { docker compose --env-file /dev/null -f "$compose_file" -p "$project" "$@"; }
cleanup() {
  status=$?
  trap - EXIT
  for project in "$run_id-fresh" "$run_id-interrupted"; do
    dc logs --no-color > "$out/$project.log" 2>&1 || true
    dc ps -a > "$out/$project-containers.txt" 2>&1 || true
    dc down --volumes --remove-orphans --timeout 15 >> "$out/cleanup.log" 2>&1 || status=1
  done
  if [ "$status" -eq 0 ]; then echo PASS > "$out/result.txt"; else echo "FAIL exit=$status" > "$out/result.txt"; fi
  exit "$status"
}
trap cleanup EXIT
sql() { dc exec -T db psql -X -U twenty -d twenty -v ON_ERROR_STOP=1 "$@"; }
wait_health() {
  local service=$1 cid state i
  cid=$(dc ps -aq "$service")
  [ -n "$cid" ]
  for ((i=0;i<120;i++)); do
    state=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid")
    case "$state" in
      'running healthy') return 0 ;;
      exited*|dead*) echo "$service exited before healthy" >&2; return 1 ;;
    esac
    sleep 5
  done
  echo "$service health timeout (600 seconds)" >&2; return 1
}
worker_stable() {
  local cid i
  cid=$(dc ps -aq worker)
  [ -n "$cid" ]
  for ((i=0;i<12;i++)); do
    [ "$(docker inspect -f '{{.State.Running}} {{.RestartCount}}' "$cid")" = 'true 0' ]
    sleep 5
  done
  dc top worker > "$out/worker-processes.txt"
  # A live shell alone is insufficient: require the actual worker process.
  grep -E 'node.*(worker|dist)' "$out/worker-processes.txt" >/dev/null
}
docker pull "$MHO255_IMAGE" > "$out/pull.txt" 2>&1
docker image inspect "$MHO255_IMAGE" > "$out/image.json"
python3 - "$out/image.json" "$expected_version" "$expected_sha" <<'PY'
import json, re, sys
image = json.load(open(sys.argv[1]))[0]
env = dict(item.split('=', 1) for item in image['Config']['Env'] if '=' in item)
version = env.get('APP_VERSION', '')
assert re.fullmatch(r'v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?', version), version
assert version == sys.argv[2], (version, sys.argv[2])
labels = image['Config'].get('Labels') or {}
assert labels.get('org.opencontainers.image.version') == version, labels
revision = labels.get('org.opencontainers.image.revision')
assert revision == sys.argv[3], (revision, sys.argv[3])
print('Image APP_VERSION and independent OCI source revision verified')
PY
dc up -d db redis
wait_health db
wait_health redis
[ "$(sql -Atc "SELECT count(*) FROM information_schema.schemata WHERE schema_name='core'")" = 0 ]
[ "$(sql -Atc "SELECT current_setting('server_version_num')::int / 10000")" = 16 ]
sql -c 'SHOW server_version' > "$out/postgres-version.txt"
dc up -d server
wait_health server
dc exec -T server curl --fail --max-time 10 http://localhost:3000/healthz > "$out/health-before.json"
[ "$(sql -Atc "SELECT to_regclass('core.workspace') IS NOT NULL")" = t ]
sql -c 'CREATE TABLE public.mho255_sentinel (value text PRIMARY KEY); INSERT INTO public.mho255_sentinel VALUES ('"'synthetic-preserved'"');'
sql -c 'SELECT * FROM core._typeorm_migrations ORDER BY id' > "$out/migrations-before.txt"
dc exec -T db pg_dump -U twenty -d twenty --schema-only > "$out/schema-before.sql"
dc exec -T db pg_dump -U twenty -d twenty -Fc > "$out/rollback-before-restart.dump"
dc exec -T db pg_restore --list < "$out/rollback-before-restart.dump" > "$out/rollback-contents.txt"
dc up -d worker
worker_stable
# Read actual container image IDs, not just Compose configuration.
for service in server worker; do
  [ "$(docker inspect -f '{{.Image}}' "$(dc ps -aq "$service")")" = "$(docker image inspect -f '{{.Id}}' "$MHO255_IMAGE")" ]
done
dc restart server
wait_health server
dc restart worker
worker_stable
dc exec -T server curl --fail --max-time 10 http://localhost:3000/healthz > "$out/health-after.json"
[ "$(sql -Atc 'SELECT value FROM public.mho255_sentinel')" = synthetic-preserved ]
sql -c 'SELECT * FROM core._typeorm_migrations ORDER BY id' > "$out/migrations-after.txt"
cmp "$out/migrations-before.txt" "$out/migrations-after.txt"
dc exec -T db pg_dump -U twenty -d twenty --schema-only > "$out/schema-after.sql"
# A later interrupted initialization may retain core.workspace. Remove one frozen
# migration receipt in this synthetic database and verify fail-closed behavior.
dc stop worker server
dc rm -f server
sql -c 'DELETE FROM core._typeorm_migrations WHERE id = (SELECT min(id) FROM core._typeorm_migrations)' > "$out/partial-delete.txt"
grep -F 'DELETE 1' "$out/partial-delete.txt" >/dev/null
sql -c 'SELECT * FROM core._typeorm_migrations ORDER BY id' > "$out/partial-ledger-before.txt"
dc up -d server
cid=$(dc ps -aq server)
for ((i=0;i<24;i++)); do
  [ "$(docker inspect -f '{{.State.Status}}' "$cid")" = exited ] && break
  sleep 5
done
[ "$(docker inspect -f '{{.State.Status}}' "$cid")" = exited ]
[ "$(docker inspect -f '{{.State.ExitCode}}' "$cid")" -ne 0 ]
dc logs --no-color server > "$out/partial-server.log"
grep -F 'Legacy initialization is incomplete' "$out/partial-server.log" >/dev/null
if grep -F 'Successfully migrated DB!' "$out/partial-server.log" >/dev/null; then
  echo 'Incomplete database incorrectly reported successful migration' >&2; exit 1
fi
[ "$(sql -Atc 'SELECT value FROM public.mho255_sentinel')" = synthetic-preserved ]
sql -c 'SELECT * FROM core._typeorm_migrations ORDER BY id' > "$out/partial-ledger-after.txt"
cmp "$out/partial-ledger-before.txt" "$out/partial-ledger-after.txt"
# Separate interrupted-initialization fixture; no serving database is touched.
project="$run_id-interrupted"
dc up -d db redis
wait_health db
wait_health redis
sql -c "CREATE SCHEMA core; CREATE TABLE public.mho255_sentinel(value text PRIMARY KEY); INSERT INTO public.mho255_sentinel VALUES ('interrupted-preserved');"
dc exec -T db pg_dump -U twenty -d twenty -Fc > "$out/interrupted-before.dump"
dc up -d server
cid=$(dc ps -aq server)
for ((i=0;i<24;i++)); do
  [ "$(docker inspect -f '{{.State.Status}}' "$cid")" = exited ] && break
  sleep 5
done
[ "$(docker inspect -f '{{.State.Status}}' "$cid")" = exited ]
[ "$(docker inspect -f '{{.State.ExitCode}}' "$cid")" -ne 0 ]
dc logs --no-color server > "$out/interrupted-server.log"
grep -F 'core schema exists without core.workspace' "$out/interrupted-server.log" >/dev/null
if grep -F 'Successfully migrated DB!' "$out/interrupted-server.log" >/dev/null; then
  echo 'Incomplete database incorrectly reported successful migration' >&2; exit 1
fi
[ "$(sql -Atc 'SELECT value FROM public.mho255_sentinel')" = interrupted-preserved ]
[ "$(sql -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='core'")" = 0 ]
printf 'image=%s\napp_version=%s\nsource_revision=%s\nproject_prefix=%s\n' "$MHO255_IMAGE" "$expected_version" "$expected_sha" "$run_id" > "$out/acceptance.txt"
echo "Acceptance passed; evidence: $out"
