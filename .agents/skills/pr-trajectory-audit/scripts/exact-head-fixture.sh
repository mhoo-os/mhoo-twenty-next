#!/usr/bin/env bash
set -euo pipefail

base="${1:-$(sed -n 's/^TWENTY_UPSTREAM_COMMIT=//p' .twenty-source)}"
head="${2:-HEAD}"
allowed='^(\.twenty-source|CLAUDE\.md|AGENTS\.md|docs/provenance/(clean-foundation-overlay|browser-shell-policy)\.md|scripts/provenance/verify-source\.sh|scripts/(generate|verify)_mhoo_assets\.py|\.agents/trajectory-review\.json|\.agents/skills/pr-trajectory-audit/|\.github/workflows/(trajectory-eval|clean-foundation-ci|clean-foundation-image)\.yml|deploy/twenty-next/|packages/twenty-front/index\.html|packages/twenty-front/public/manifest\.json|packages/twenty-front/public/images/mhoo/|packages/twenty-front/src/generated-metadata/graphql\.ts|packages/twenty-front/src/modules/client-config/components/(ClientConfigProviderEffect|__tests__/ClientConfigProviderEffect)(\.test)?\.tsx|packages/twenty-front/src/modules/client-config/hooks/(useClientConfig|__tests__/useClientConfig)(\.test)?\.tsx?|packages/twenty-front/src/modules/client-config/states/(brandState|clientConfigApiStatusState)\.ts|packages/twenty-front/src/modules/client-config/types/ClientConfig\.ts|packages/twenty-front/src/modules/ui/utilities/(page-title/components/PageTitle|page-favicon/components/PageFavicon)(\.test)?\.tsx?|packages/twenty-front/src/modules/ui/utilities/(page-title/components/__tests__/PageTitle|page-favicon/components/__tests__/PageTitle|page-favicon/components/__tests__/PageFavicon)\.test\.ts|packages/twenty-front/src/testing/mock-data/config\.ts|packages/twenty-front/src/utils/title-utils\.ts|packages/twenty-front/src/utils/__tests__/title-utils\.test\.ts|packages/twenty-shared/src/branding/|packages/twenty-shared/(package|project)\.json|packages/twenty-server/\.env\.example|packages/twenty-server/src/engine/core-modules/twenty-config/(config-variables|twenty-config\.module)\.ts|packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver\.service(\.spec)?\.ts|packages/twenty-server/src/engine/core-modules/client-config/(client-config\.entity|client-config\.controller\.spec|services/client-config\.service)\.ts|packages/twenty-client-sdk/src/metadata/generated/)'

git diff --name-only "$base" "$head" | while IFS= read -r path; do
  [[ "$path" =~ $allowed ]] || { printf 'trajectory fixture rejected: %s\n' "$path" >&2; exit 1; }
done
scripts/provenance/verify-source.sh
printf 'trajectory exact-head fixture passed\n'
