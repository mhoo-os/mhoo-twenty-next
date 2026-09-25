#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TARGETS_FILE=${CLOVER_RELEASE_TARGETS_FILE:-"$ROOT_DIR/ops/clover/release-targets.json"}
TWENTY_CLI=${TWENTY_CLI:-"$ROOT_DIR/packages/twenty-sdk/dist/cli.cjs"}
DRY_RUN=${CLOVER_RELEASE_DRY_RUN:-false}

if [[ ! -f "$TARGETS_FILE" ]]; then
  echo "Missing Clover release target manifest: $TARGETS_FILE" >&2
  exit 1
fi

if [[ ! -f "$TWENTY_CLI" ]]; then
  echo "Missing Twenty CLI: $TWENTY_CLI" >&2
  exit 1
fi

target_rows=()
while IFS= read -r row; do
  target_rows+=("$row")
done < <(node - "$TARGETS_FILE" <<'NODE'
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!manifest.appPath || !Array.isArray(manifest.targets) || manifest.targets.length === 0) {
  throw new Error('Manifest must define appPath and at least one target');
}

const names = new Set();
for (const target of manifest.targets) {
  if (
    !target ||
    typeof target.name !== 'string' ||
    typeof target.url !== 'string' ||
    typeof target.apiKeyEnv !== 'string' ||
    typeof target.publish !== 'boolean'
  ) {
    throw new Error('Every target needs name, url, apiKeyEnv, and publish');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(target.name)) {
    throw new Error(`Invalid remote name: ${target.name}`);
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(target.apiKeyEnv)) {
    throw new Error(`Invalid secret environment name: ${target.apiKeyEnv}`);
  }
  if (names.has(target.name)) {
    throw new Error(`Duplicate remote name: ${target.name}`);
  }
  names.add(target.name);
  process.stdout.write(
    [target.name, target.url, target.apiKeyEnv, target.publish ? 'true' : 'false'].join('\t') + '\n',
  );
}
NODE
)

APP_PATH=$(node - "$TARGETS_FILE" <<'NODE'
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write(manifest.appPath);
NODE
)

APP_VERSION=$(node - "$ROOT_DIR/$APP_PATH/package.json" <<'NODE'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
  throw new Error('App package.json must define a version');
}
process.stdout.write(packageJson.version);
NODE
)

if [[ "${GITHUB_REF_TYPE:-}" == "tag" ]]; then
  expected_version=${GITHUB_REF_NAME#clover-v}
  if [[ "$expected_version" == "$GITHUB_REF_NAME" || "$expected_version" != "$APP_VERSION" ]]; then
    echo "Release tag must be clover-v$APP_VERSION; got ${GITHUB_REF_NAME:-unknown}" >&2
    exit 1
  fi
fi

echo "Releasing @mhoo/clover v$APP_VERSION to $((${#target_rows[@]})) target(s)."

for row in "${target_rows[@]}"; do
  IFS=$'\t' read -r remote_name remote_url api_key_env should_publish <<<"$row"
  if [[ -z "${!api_key_env:-}" ]]; then
    echo "Missing required secret environment variable: $api_key_env" >&2
    exit 1
  fi
  echo "Authenticating remote $remote_name at $remote_url"
  if [[ "$DRY_RUN" != "true" ]]; then
    node "$TWENTY_CLI" remote:add \
      --as "$remote_name" \
      --url "$remote_url" \
      --api-key "${!api_key_env}"
  fi
done

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run complete; no publication or installation performed."
  exit 0
fi

for row in "${target_rows[@]}"; do
  IFS=$'\t' read -r remote_name _ _ should_publish <<<"$row"
  if [[ "$should_publish" == "true" ]]; then
    echo "Publishing v$APP_VERSION to $remote_name"
    node "$TWENTY_CLI" app:publish --private -r "$remote_name" "$ROOT_DIR/$APP_PATH"
  fi
done

for row in "${target_rows[@]}"; do
  IFS=$'\t' read -r remote_name _ _ _ <<<"$row"
  echo "Installing v$APP_VERSION on $remote_name"
  node "$TWENTY_CLI" app:install -r "$remote_name" "$ROOT_DIR/$APP_PATH"
done

echo "Clover v$APP_VERSION published and installed on all configured targets."
