#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

value() { sed -n "s/^$1=//p" .twenty-source; }
fail() { printf 'source custody failed: %s\n' "$1" >&2; exit 1; }

commit="$(value TWENTY_UPSTREAM_COMMIT)"
tree="$(value TWENTY_UPSTREAM_TREE)"
ref="$(value TWENTY_UPSTREAM_REF)"
repo="$(value TWENTY_UPSTREAM_REPOSITORY)"

test "$(git rev-parse "${commit}^{tree}")" = "$tree" || fail 'upstream tree mismatch'
test "$(git merge-base --is-ancestor "$commit" HEAD; echo $?)" = 0 || fail 'upstream base is not an ancestor'
test "$(git ls-remote "$repo" "$ref" | awk 'NR==1 {print $1}')" = "$commit" || fail 'upstream ref mismatch'
test "$(shasum -a 256 yarn.lock | awk '{print $1}')" = "$(value TWENTY_LOCKFILE_SHA256)" || fail 'lockfile mismatch'
test "$(shasum -a 256 packages/twenty-docker/twenty/Dockerfile | awk '{print $1}')" = "$(value TWENTY_DOCKERFILE_SHA256)" || fail 'Dockerfile mismatch'
printf 'source custody passed\nupstream_commit=%s\nupstream_tree=%s\n' "$commit" "$tree"
