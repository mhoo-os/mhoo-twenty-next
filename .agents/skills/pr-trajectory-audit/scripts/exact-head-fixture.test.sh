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

upstream_base="$(sed -n 's/^TWENTY_UPSTREAM_COMMIT=//p' .twenty-source)"
bash "$fixture" "$upstream_base" HEAD \
  >"$temporary_directory/cumulative-head-output"

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
GIT_INDEX_FILE="$temporary_directory/index" git read-tree HEAD
GIT_INDEX_FILE="$temporary_directory/index" git update-index --add \
  --cacheinfo 100644 "$suffix_blob" "$suffix_path"
suffix_tree="$(GIT_INDEX_FILE="$temporary_directory/index" git write-tree)"
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
  fixture_index="$temporary_directory/index"
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
  fixture_index="$temporary_directory/index"
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

finance_allowed_paths=(
  packages/twenty-apps/internal/mhoo-finance/.gitignore
  packages/twenty-apps/internal/mhoo-finance/README.md
  packages/twenty-apps/internal/mhoo-finance/fixtures/mhoo-finance-fixture-pack.json
  packages/twenty-apps/internal/mhoo-finance/src/application.config.ts
  packages/twenty-apps/internal/mhoo-finance/src/front-components/finance-audit-dashboard.front-component.tsx
)

for index in "${!finance_allowed_paths[@]}"; do
  path="${finance_allowed_paths[$index]}"
  blob="$({ git show "HEAD:$path"; printf '\n# exact-root Finance fixture\n'; } | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: allow exact Finance source root path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE="2000-01-01T00:07:0${index}Z" \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE="2000-01-01T00:07:0${index}Z" \
      git commit-tree "$tree" -p HEAD
  )"

  bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/finance-allowed-$index-output"
done

rogue_finance_paths=(
  packages/twenty-apps/internal/mhoo-finance.backup/README.md
  nested/packages/twenty-apps/internal/mhoo-finance/README.md
  packages/twenty-apps/internal/mhoo-financeish/README.md
  packages/twenty-apps/internal/mhoo-finance-archive/README.md
)

for index in "${!rogue_finance_paths[@]}"; do
  path="${rogue_finance_paths[$index]}"
  blob="$(printf 'rogue Finance source fixture\n' | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index --add \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: reject inexact Finance source root path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE="2000-01-01T00:08:0${index}Z" \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE="2000-01-01T00:08:0${index}Z" \
      git commit-tree "$tree" -p HEAD
  )"

  if bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/rogue-finance-$index-output" 2>&1; then
    printf 'exact-head fixture test failed: rogue Finance source path passed: %s\n' \
      "$path" >&2
    exit 1
  fi

  grep -Fq "trajectory fixture rejected: $path" \
    "$temporary_directory/rogue-finance-$index-output" || {
      printf 'exact-head fixture test failed: unexpected Finance source rejection\n' >&2
      sed -n '1,120p' "$temporary_directory/rogue-finance-$index-output" >&2
      exit 1
    }
done

workflow_allowed_path=.github/workflows/ci-create-app-e2e-minimal.yaml
workflow_blob="$({ git show "HEAD:$workflow_allowed_path"; printf '\n# exact PR21 workflow fixture\n'; } | git hash-object -w --stdin)"
fixture_index="$temporary_directory/index"
GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
GIT_INDEX_FILE="$fixture_index" git update-index \
  --cacheinfo 100644 "$workflow_blob" "$workflow_allowed_path"
workflow_tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
workflow_head="$(
  printf 'test: allow exact PR21 create-app workflow path\n' |
    GIT_AUTHOR_NAME='Trajectory fixture' \
    GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
    GIT_AUTHOR_DATE='2000-01-01T00:09:00Z' \
    GIT_COMMITTER_NAME='Trajectory fixture' \
    GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
    GIT_COMMITTER_DATE='2000-01-01T00:09:00Z' \
    git commit-tree "$workflow_tree" -p HEAD
  )"

bash "$fixture" HEAD "$workflow_head" \
  >"$temporary_directory/workflow-allowed-output"

rogue_workflow_paths=(
  .github/workflows/ci-create-app-e2e-minimal.yaml.backup
  .github/workflows/ci-create-app-e2e-minimal.yml
  .github/workflows/ci-create-app-e2e-minimalXyaml
  .github/workflows/ci-create-app-e2e-minimal-other.yaml
  nested/.github/workflows/ci-create-app-e2e-minimal.yaml
  .github/workflows/ci-create-app-e2e.yaml
)

for index in "${!rogue_workflow_paths[@]}"; do
  path="${rogue_workflow_paths[$index]}"
  blob="$(printf 'rogue workflow source fixture\n' | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index --add \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: reject inexact PR21 workflow path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE="2000-01-01T00:10:0${index}Z" \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE="2000-01-01T00:10:0${index}Z" \
      git commit-tree "$tree" -p HEAD
  )"

  if bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/rogue-workflow-$index-output" 2>&1; then
    printf 'exact-head fixture test failed: rogue workflow path passed: %s\n' \
      "$path" >&2
    exit 1
  fi

  grep -Fq "trajectory fixture rejected: $path" \
    "$temporary_directory/rogue-workflow-$index-output" || {
      printf 'exact-head fixture test failed: unexpected workflow rejection\n' >&2
      sed -n '1,120p' "$temporary_directory/rogue-workflow-$index-output" >&2
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
  fixture_index="$temporary_directory/index"
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
  fixture_index="$temporary_directory/index"
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

cumulative_allowed_paths=(
  docs/provenance/server-public-presentation-ledger.md
  packages/twenty-server/src/engine/core-modules/emailing-domain/services/unsubscribe-content.service.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/services/unsubscribe-content.service.spec.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/types/__tests__/emailing-public-page-brand.type.spec.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-emailing-public-page-markup.util.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-html-footer.util.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-preferences-page.util.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-result-page.util.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-text-footer.util.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/__tests__/build-emailing-public-page-markup.util.spec.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/__tests__/build-unsubscribe-preferences-page.util.spec.ts
  packages/twenty-server/src/modules/emailing/controllers/unsubscribe.controller.ts
  packages/twenty-server/src/modules/emailing/controllers/unsubscribe.controller.spec.ts
  docs/provenance/brand-touchpoint-ledger.json
  docs/provenance/brand-residue-gate.md
  scripts/branding/check_customer_brand_residue.py
  .github/workflows/ci-brand-residue.yml
)

for index in "${!cumulative_allowed_paths[@]}"; do
  path="${cumulative_allowed_paths[$index]}"
  blob="$({ git show "HEAD:$path"; printf '\n# cumulative fixture\n'; } | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: allow exact cumulative path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE='2000-01-01T00:05:00Z' \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE='2000-01-01T00:05:00Z' \
      git commit-tree "$tree" -p HEAD
  )"

  bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/cumulative-$index-output"
done

rogue_cumulative_paths=(
  docs/provenance/server-public-presentation-ledger.md.backup
  nested/docs/provenance/server-public-presentation-ledger.md
  docs/provenance/server-public-presentation-ledgerXmd
  packages/twenty-server/src/engine/core-modules/emailing-domain/services/rogue/unsubscribe-content.service.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/services/unsubscribe-content.service.ts.backup
  packages/twenty-server/src/engine/core-modules/emailing-domain/types/rogue/emailing-public-page-brand.type.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.typeXts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/rogue/build-emailing-public-page-markup.util.ts
  packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-result-page.util.ts.backup
  packages/twenty-server/src/modules/emailing/controllers/rogue/unsubscribe.controller.ts
  packages/twenty-server/src/modules/emailing/controllers/unsubscribe.controllerXts
  docs/provenance/brand-touchpoint-ledger.json.backup
  nested/docs/provenance/brand-residue-gate.md
  docs/provenance/brand-residue-gateXmd
  nested/scripts/branding/check_customer_brand_residue.py
  scripts/brandingish/check_customer_brand_residue.py
  nested/.github/workflows/ci-brand-residue.yml
  .github/workflows/ci-brand-residue.yml.backup
  .github/workflows/ci-brand-residueXyml
)

for index in "${!rogue_cumulative_paths[@]}"; do
  path="${rogue_cumulative_paths[$index]}"
  blob="$(printf 'rogue cumulative fixture\n' | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index --add \
    --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: reject inexact cumulative path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE='2000-01-01T00:06:00Z' \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE='2000-01-01T00:06:00Z' \
      git commit-tree "$tree" -p HEAD
  )"

  if bash "$fixture" HEAD "$candidate_head" \
    >"$temporary_directory/rogue-cumulative-$index-output" 2>&1; then
    printf 'exact-head fixture test failed: rogue cumulative path passed: %s\n' \
      "$path" >&2
    exit 1
  fi

  grep -Fq "trajectory fixture rejected: $path" \
    "$temporary_directory/rogue-cumulative-$index-output" || {
      printf 'exact-head fixture test failed: unexpected cumulative rejection\n' >&2
      sed -n '1,120p' \
        "$temporary_directory/rogue-cumulative-$index-output" >&2
      exit 1
    }
done

legal_allowed_paths=(
  docs/legal/mhoo/v2.0/01-mhoo-master-terms-v2.0.md
  docs/legal/mhoo/v2.0/02-mhoo-privacy-policy-v2.0.md
  docs/legal/mhoo/v2.0/03-mhoo-acceptable-use-policy-v2.0.md
  docs/legal/mhoo/v2.0/04-mhoo-open-source-notice-v2.0.md
  docs/legal/mhoo/v2.0/05-mhoo-dpa-availability-notice-v2.0.md
  docs/legal/mhoo/v2.0/06-mhoo-legal-approval-record-v2.0.md
  docs/legal/mhoo/v2.0/mhoo-legal-packet-manifest-v2.0.json
  docs/provenance/mhoo-legal-packet-v2.0.md
  scripts/legal/verify_mhoo_legal_packet.py
  scripts/legal/generate_mhoo_legal_sources.py
  scripts/legal/test_verify_mhoo_legal_packet.py
  packages/twenty-front/src/pages/legal/LegalDocumentApp.tsx
  packages/twenty-front/src/pages/legal/LegalDocumentPage.tsx
  packages/twenty-front/src/pages/legal/legal-document-config.ts
  packages/twenty-front/src/pages/legal/legal-document-sources.generated.ts
  packages/twenty-front/src/pages/legal/__tests__/LegalDocumentPage.test.tsx
  packages/twenty-front/src/modules/app/components/DomainShell.tsx
  packages/twenty-front/src/modules/app/components/__tests__/DomainShell.test.tsx
  packages/twenty-shared/src/types/AppPath.ts
)

for index in "${!legal_allowed_paths[@]}"; do
  path="${legal_allowed_paths[$index]}"
  blob="$({ git show "HEAD:$path"; printf '\n# exact legal fixture\n'; } | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: allow exact legal path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE='2000-01-01T00:06:30Z' \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE='2000-01-01T00:06:30Z' \
      git commit-tree "$tree" -p HEAD
  )"

  bash "$fixture" HEAD "$candidate_head" >"$temporary_directory/legal-$index-output"
done

rogue_legal_paths=(
  docs/legal/mhoo/v2.0/01-mhoo-master-terms-v2.0.md.backup
  docs/legal/mhoo/v2.0/rogue/01-mhoo-master-terms-v2.0.md
  nested/docs/legal/mhoo/v2.0/01-mhoo-master-terms-v2.0.md
  docs/legal/mhoo/v2.0/01-mhoo-master-terms-v2X0.md
  docs/provenance/mhoo-legal-packet-v2.0.md.backup
  nested/docs/provenance/mhoo-legal-packet-v2.0.md
  scripts/legal/rogue/verify_mhoo_legal_packet.py
  scripts/legal/verify_mhoo_legal_packet.py.backup
  packages/twenty-front/src/pages/legal/rogue/LegalDocumentPage.tsx
  packages/twenty-front/src/pages/legal/LegalDocumentPage.tsx.backup
  nested/packages/twenty-front/src/pages/legal/LegalDocumentPage.tsx
  packages/twenty-front/src/modules/app/components/rogue/DomainShell.tsx
  packages/twenty-front/src/modules/app/components/DomainShell.tsx.backup
  packages/twenty-front/src/modules/app/components/__tests__/rogue/DomainShell.test.tsx
  packages/twenty-shared/src/types/rogue/AppPath.ts
  packages/twenty-shared/src/types/AppPath.ts.backup
)

for index in "${!rogue_legal_paths[@]}"; do
  path="${rogue_legal_paths[$index]}"
  blob="$(printf 'rogue legal fixture\n' | git hash-object -w --stdin)"
  fixture_index="$temporary_directory/index"
  GIT_INDEX_FILE="$fixture_index" git read-tree HEAD
  GIT_INDEX_FILE="$fixture_index" git update-index --add --cacheinfo 100644 "$blob" "$path"
  tree="$(GIT_INDEX_FILE="$fixture_index" git write-tree)"
  candidate_head="$(
    printf 'test: reject inexact legal path\n' |
      GIT_AUTHOR_NAME='Trajectory fixture' \
      GIT_AUTHOR_EMAIL='trajectory-fixture@example.invalid' \
      GIT_AUTHOR_DATE='2000-01-01T00:06:31Z' \
      GIT_COMMITTER_NAME='Trajectory fixture' \
      GIT_COMMITTER_EMAIL='trajectory-fixture@example.invalid' \
      GIT_COMMITTER_DATE='2000-01-01T00:06:31Z' \
      git commit-tree "$tree" -p HEAD
  )"

  if bash "$fixture" HEAD "$candidate_head" >"$temporary_directory/rogue-legal-$index-output" 2>&1; then
    printf 'exact-head fixture test failed: rogue legal path passed: %s\n' "$path" >&2
    exit 1
  fi

  grep -Fq "trajectory fixture rejected: $path" "$temporary_directory/rogue-legal-$index-output" || {
    printf 'exact-head fixture test failed: unexpected legal rejection\n' >&2
    sed -n '1,120p' "$temporary_directory/rogue-legal-$index-output" >&2
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
