#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

fixture=.agents/skills/pr-trajectory-audit/scripts/exact-head-fixture.sh
source_verifier=scripts/provenance/verify-source.sh
workflow=.github/workflows/pr-review-dispatch.yaml
temporary_directory="$(mktemp -d)"

cleanup() {
  if [[ -f "$temporary_directory/yarn.lock" ]]; then
    cp "$temporary_directory/yarn.lock" yarn.lock
  fi
  rm -rf -- "$temporary_directory"
}
trap cleanup EXIT

unsafe_blob="$({
  sed 's/^  workflow_dispatch:$/  pull_request_target:/' "$workflow"
} | git hash-object -w --stdin)"

GIT_INDEX_FILE="$temporary_directory/index" git read-tree HEAD
GIT_INDEX_FILE="$temporary_directory/index" git update-index \
  --cacheinfo 100644 "$unsafe_blob" "$workflow"
unsafe_tree="$(GIT_INDEX_FILE="$temporary_directory/index" git write-tree)"
unsafe_head="$(
  printf 'test: restore unsafe PR target trigger\n' |
    GIT_AUTHOR_NAME='Trajectory fixture' \
    GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
    GIT_AUTHOR_DATE='2000-01-01T00:00:00Z' \
    GIT_COMMITTER_NAME='Trajectory fixture' \
    GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
    GIT_COMMITTER_DATE='2000-01-01T00:00:00Z' \
    git commit-tree "$unsafe_tree" -p HEAD
)"

if bash "$fixture" HEAD "$unsafe_head" >"$temporary_directory/output" 2>&1; then
  printf 'exact-head fixture test failed: unsafe non-checked-out ref passed\n' >&2
  exit 1
fi

grep -Fq "pull_request_target restored: $workflow" "$temporary_directory/output" || {
  printf 'exact-head fixture test failed: unexpected rejection\n' >&2
  sed -n '1,120p' "$temporary_directory/output" >&2
  exit 1
}

test "$(git rev-parse HEAD)" != "$unsafe_head"

suffix_path=scripts/docs/check_app_docs_drift.py.backup
suffix_blob="$(git hash-object -w scripts/docs/check_app_docs_drift.py)"
GIT_INDEX_FILE="$temporary_directory/suffix-index" git read-tree HEAD
GIT_INDEX_FILE="$temporary_directory/suffix-index" git update-index --add \
  --cacheinfo 100644 "$suffix_blob" "$suffix_path"
suffix_tree="$(GIT_INDEX_FILE="$temporary_directory/suffix-index" git write-tree)"
suffix_head="$(
  printf 'test: add suffix bypass candidate\n' |
    GIT_AUTHOR_NAME='Trajectory fixture' \
    GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
    GIT_AUTHOR_DATE='2000-01-01T00:00:01Z' \
    GIT_COMMITTER_NAME='Trajectory fixture' \
    GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
    GIT_COMMITTER_DATE='2000-01-01T00:00:01Z' \
    git commit-tree "$suffix_tree" -p HEAD
)"

if bash "$fixture" HEAD "$suffix_head" >"$temporary_directory/suffix-output" 2>&1; then
  printf 'exact-head fixture test failed: approved-path suffix passed\n' >&2
  exit 1
fi

grep -Fq "trajectory fixture rejected: $suffix_path" "$temporary_directory/suffix-output" || {
  printf 'exact-head fixture test failed: unexpected suffix rejection\n' >&2
  sed -n '1,120p' "$temporary_directory/suffix-output" >&2
  exit 1
}

allowed_paths=(
  packages/twenty-front/src/locales/ja-JP.po
  packages/twenty-front/src/locales/generated/ja-JP.ts
  packages/twenty-emails/src/locales/ja-JP.po
  packages/twenty-emails/src/locales/generated/ja-JP.ts
  packages/twenty-server/src/engine/core-modules/i18n/locales/ja-JP.po
  packages/twenty-server/src/engine/core-modules/i18n/locales/generated/ja-JP.ts
  packages/twenty-front/src/modules/client-config/components/ClientConfigProviderEffect.tsx
  packages/twenty-front/src/modules/settings/billing/components/AddPaymentMethodForm.tsx
)

for index in "${!allowed_paths[@]}"; do
  path="${allowed_paths[$index]}"
  blob="$({ git show "HEAD:$path"; printf '\n# exact-root fixture\n'; } | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/locale-catalog-$index-index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: allow exact-root locale catalog path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE="2000-01-01T00:01:0${index}Z" \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE="2000-01-01T00:01:0${index}Z" \
      git commit-tree "$tree" -p HEAD
  )"

  bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/locale-catalog-$index-output"
done

rogue_allowed_paths=(
  packages/twenty-emails/src/locales/ja-JP.po.backup
  packages/twenty-emails/src/locales/rogue/ja-JP.po
  packages/twenty-server/src/engine/core-modules/i18n/locales.generated/ja-JP.ts
  nested/packages/twenty-front/src/locales/ja-JP.po
  packages/twenty-front/src/modules/client-config/components/rogue/ClientConfigProviderEffect.tsx
  packages/twenty-front/src/modules/settings/billing/components/rogue/AddPaymentMethodForm.tsx
)

for index in "${!rogue_allowed_paths[@]}"; do
  path="${rogue_allowed_paths[$index]}"
  blob="$(printf 'rogue locale catalog fixture\n' | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/rogue-locale-catalog-$index-index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index --add \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: reject inexact locale catalog path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE="2000-01-01T00:02:0${index}Z" \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE="2000-01-01T00:02:0${index}Z" \
      git commit-tree "$tree" -p HEAD
  )"

  if bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/rogue-locale-catalog-$index-output" 2>&1; then
    printf 'exact-head fixture test failed: rogue locale/catalog path passed: %s\n' \
      "$path" >&2
    exit 1
  fi

  grep -Fq "trajectory fixture rejected: $path" \
    "$temporary_directory/rogue-locale-catalog-$index-output" || {
      printf 'exact-head fixture test failed: unexpected locale/catalog rejection\n' >&2
      sed -n '1,120p' \
        "$temporary_directory/rogue-locale-catalog-$index-output" >&2
      exit 1
    }
done

distribution_allowed_paths=(
  README.md
  docs/provenance/distribution-display-ledger.md
  packages/twenty-docker/docker-compose.yml
  packages/twenty-docs/README.md
  packages/twenty-docs/docs.json
  packages/twenty-docs/package.json
  packages/twenty-codex-plugin/README.md
  packages/twenty-codex-plugin/package.json
)

for index in "${!distribution_allowed_paths[@]}"; do
  path="${distribution_allowed_paths[$index]}"
  blob="$({ git show "HEAD:$path"; printf '\n# distribution fixture\n'; } | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/distribution-$index-index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: allow exact distribution path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE='2000-01-01T00:03:00Z' \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE='2000-01-01T00:03:00Z' \
      git commit-tree "$tree" -p HEAD
  )"

  bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/distribution-$index-output"
done

rogue_distribution_paths=(
  README.md.backup
  nested/README.md
  READMExmd
  docs/provenance/distribution-display-ledger.md.backup
  nested/docs/provenance/distribution-display-ledger.md
  docs/provenance/distribution-display-ledgerXmd
  nested/packages/twenty-docker/docker-compose.yml
  packages/twenty-dockerish/docker-compose.yml
  packages/twenty-docs/README.md.backup
  nested/packages/twenty-docs/README.md
  packages/twenty-docs/READMExmd
  packages/twenty-docs/docs.json.backup
  nested/packages/twenty-docs/docs.json
  packages/twenty-docs/docsXjson
  packages/twenty-docs/package.json.backup
  nested/packages/twenty-docs/package.json
  packages/twenty-docs/packageXjson
  packages/twenty-codex-plugin/README.md.backup
  nested/packages/twenty-codex-plugin/README.md
  packages/twenty-codex-plugin/READMExmd
  packages/twenty-codex-plugin/package.json.backup
  nested/packages/twenty-codex-plugin/package.json
  packages/twenty-codex-plugin/packageXjson
)

for index in "${!rogue_distribution_paths[@]}"; do
  path="${rogue_distribution_paths[$index]}"
  blob="$(printf 'rogue distribution fixture\n' | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/rogue-distribution-$index-index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index --add \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: reject inexact distribution path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE='2000-01-01T00:04:00Z' \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE='2000-01-01T00:04:00Z' \
      git commit-tree "$tree" -p HEAD
  )"

  if bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/rogue-distribution-$index-output" 2>&1; then
    printf 'exact-head fixture test failed: rogue distribution path passed: %s\n' \
      "$path" >&2
    exit 1
  fi

  grep -Fq "trajectory fixture rejected: $path" \
    "$temporary_directory/rogue-distribution-$index-output" || {
      printf 'exact-head fixture test failed: unexpected distribution rejection\n' >&2
      sed -n '1,120p' \
        "$temporary_directory/rogue-distribution-$index-output" >&2
      exit 1
    }
done

unrelated_head="$(
  printf 'test: unrelated source ancestry\n' |
    GIT_AUTHOR_NAME='Trajectory fixture' \
    GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
    GIT_AUTHOR_DATE='2000-01-02T00:00:00Z' \
    GIT_COMMITTER_NAME='Trajectory fixture' \
    GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
    GIT_COMMITTER_DATE='2000-01-02T00:00:00Z' \
    git commit-tree "$(git rev-parse 'HEAD^{tree}')"
)"

if bash "$fixture" HEAD "$unrelated_head" >"$temporary_directory/unrelated-output" 2>&1; then
  printf 'exact-head fixture test failed: unrelated named head passed\n' >&2
  exit 1
fi

grep -Fq 'source custody failed: upstream base is not an ancestor' \
  "$temporary_directory/unrelated-output" || {
  printf 'exact-head fixture test failed: unexpected ancestry rejection\n' >&2
  sed -n '1,120p' "$temporary_directory/unrelated-output" >&2
  exit 1
}

cp yarn.lock "$temporary_directory/yarn.lock"
printf '\n# exact-head-fixture dirty-worktree regression\n' >>yarn.lock

bash "$fixture" HEAD HEAD >"$temporary_directory/explicit-ref-output"

if bash "$source_verifier" >"$temporary_directory/dirty-output" 2>&1; then
  printf 'exact-head fixture test failed: dirty working-tree lockfile passed\n' >&2
  exit 1
fi

grep -Fq 'source custody failed: lockfile mismatch' \
  "$temporary_directory/dirty-output" || {
  printf 'exact-head fixture test failed: unexpected dirty-worktree rejection\n' >&2
  sed -n '1,120p' "$temporary_directory/dirty-output" >&2
  exit 1
}

cp "$temporary_directory/yarn.lock" yarn.lock
printf 'exact-head fixture regression test passed\n'
