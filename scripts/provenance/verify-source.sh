#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

fail() { printf 'source custody failed: %s\n' "$1" >&2; exit 1; }

target="${1:-}"
if [[ -n "$target" ]]; then
  value() { git show "${target}:.twenty-source" | sed -n "s/^$1=//p"; }
  blob_sha256() { git show "${target}:$1" | shasum -a 256 | awk '{print $1}'; }
  ancestry_target="$target"
else
  value() { sed -n "s/^$1=//p" .twenty-source; }
  blob_sha256() { shasum -a 256 "$1" | awk '{print $1}'; }
  ancestry_target=HEAD
fi

commit="$(value TWENTY_UPSTREAM_COMMIT)"
tree="$(value TWENTY_UPSTREAM_TREE)"
ref="$(value TWENTY_UPSTREAM_REF)"
repo="$(value TWENTY_UPSTREAM_REPOSITORY)"

test "$(git rev-parse "${commit}^{tree}")" = "$tree" || fail 'upstream tree mismatch'
git merge-base --is-ancestor "$commit" "$ancestry_target" || fail 'upstream base is not an ancestor'
test "$(git ls-remote "$repo" "$ref" | awk 'NR==1 {print $1}')" = "$commit" || fail 'upstream ref mismatch'
test "$(blob_sha256 yarn.lock)" = "$(value TWENTY_LOCKFILE_SHA256)" || fail 'lockfile mismatch'
test "$(blob_sha256 packages/twenty-docker/twenty/Dockerfile)" = "$(value TWENTY_DOCKERFILE_SHA256)" || fail 'Dockerfile mismatch'
printf 'source custody passed\nupstream_commit=%s\nupstream_tree=%s\n' "$commit" "$tree"
