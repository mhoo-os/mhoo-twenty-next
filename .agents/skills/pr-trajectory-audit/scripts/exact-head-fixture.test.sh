#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

fixture=.agents/skills/pr-trajectory-audit/scripts/exact-head-fixture.sh
workflow=.github/workflows/pr-review-dispatch.yaml
temporary_directory="$(mktemp -d)"
trap 'rm -rf -- "$temporary_directory"' EXIT

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
printf 'exact-head fixture regression test passed\n'
