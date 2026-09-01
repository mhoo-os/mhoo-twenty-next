#!/usr/bin/env bash
set -euo pipefail

base="${1:-$(sed -n 's/^TWENTY_UPSTREAM_COMMIT=//p' .twenty-source)}"
head="${2:-HEAD}"
allowed='^(\.twenty-source|CLAUDE\.md|AGENTS\.md|docs/provenance/(clean-foundation-overlay|workspace-presentation-policy)\.md|scripts/provenance/verify-source\.sh|scripts/(generate|verify)_mhoo_assets\.py|\.agents/trajectory-review\.json|\.agents/skills/pr-trajectory-audit/|\.github/workflows/(trajectory-eval|clean-foundation-ci|clean-foundation-image)\.yml|deploy/twenty-next/|packages/twenty-front/public/images/mhoo/|packages/twenty-shared/src/branding/|packages/twenty-shared/(package|project)\.json|packages/twenty-server/\.env\.example|packages/twenty-server/src/engine/core-modules/twenty-config/(config-variables|twenty-config\.module)\.ts|packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver\.service(\.spec)?\.ts|packages/twenty-server/src/engine/core-modules/workspace/workspace\.resolver\.ts)'

git diff --name-only "$base" "$head" | while IFS= read -r path; do
  [[ "$path" =~ $allowed ]] || { printf 'trajectory fixture rejected: %s\n' "$path" >&2; exit 1; }
done
scripts/provenance/verify-source.sh
printf 'trajectory exact-head fixture passed\n'
