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

locale_catalog_paths=(
  packages/twenty-front/src/locales/ja-JP.po
  packages/twenty-front/src/locales/generated/ja-JP.ts
  packages/twenty-emails/src/locales/ja-JP.po
  packages/twenty-emails/src/locales/generated/ja-JP.ts
  packages/twenty-server/src/engine/core-modules/i18n/locales/ja-JP.po
  packages/twenty-server/src/engine/core-modules/i18n/locales/generated/ja-JP.ts
)

for index in "${!locale_catalog_paths[@]}"; do
  path="${locale_catalog_paths[$index]}"
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

rogue_locale_catalog_paths=(
  packages/twenty-emails/src/locales/ja-JP.po.backup
  packages/twenty-emails/src/locales/rogue/ja-JP.po
  packages/twenty-server/src/engine/core-modules/i18n/locales.generated/ja-JP.ts
  nested/packages/twenty-front/src/locales/ja-JP.po
)

for index in "${!rogue_locale_catalog_paths[@]}"; do
  path="${rogue_locale_catalog_paths[$index]}"
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
