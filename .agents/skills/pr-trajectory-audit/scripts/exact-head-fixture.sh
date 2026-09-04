#!/usr/bin/env bash
set -euo pipefail

base="${1:-$(sed -n 's/^TWENTY_UPSTREAM_COMMIT=//p' .twenty-source)}"
head="${2:-HEAD}"
allowed='^(\.twenty-source|CLAUDE\.md|AGENTS\.md|docs/provenance/(clean-foundation-overlay|browser-shell-policy|workspace-presentation-policy|auth-onboarding-touchpoint-ledger|authenticated-ui-touchpoint-ledger)\.md|scripts/provenance/verify-source\.sh|scripts/(generate|verify)_mhoo_assets\.py|scripts/docs/(check_app_docs_drift|test_app_docs_drift)\.py|\.agents/trajectory-review\.json|\.agents/skills/pr-trajectory-audit/.*|\.github/workflows/(trajectory-eval|clean-foundation-ci|clean-foundation-image)\.yml|\.github/workflows/(ci-app-docs-drift|pr-review-dispatch|external-contributor-pr-auto-draft)\.yaml|deploy/twenty-next/.*|packages/twenty-front/index\.html|packages/twenty-front/public/manifest\.json|packages/twenty-front/public/images/mhoo/.*|packages/twenty-front/src/generated-metadata/graphql\.ts|packages/twenty-front/src/modules/client-config/components/(ClientConfigProviderEffect|__tests__/ClientConfigProviderEffect)(\.test)?\.tsx|packages/twenty-front/src/modules/client-config/hooks/(useClientConfig|__tests__/useClientConfig)(\.test)?\.tsx?|packages/twenty-front/src/modules/client-config/hooks/useResolvedBrand\.ts|packages/twenty-front/src/modules/client-config/utils/getBrandUrl\.ts|packages/twenty-front/src/modules/client-config/utils/__tests__/getBrandUrl\.test\.ts|packages/twenty-front/src/modules/client-config/states/(brandState|clientConfigApiStatusState)\.ts|packages/twenty-front/src/modules/client-config/types/ClientConfig\.ts|packages/twenty-front/src/modules/workspace/utils/(getWorkspacePresentation|__tests__/getWorkspacePresentation\.test)\.ts|packages/twenty-front/src/modules/ui/utilities/(page-title/components/PageTitle|page-favicon/components/PageFavicon)(\.test)?\.tsx?|packages/twenty-front/src/modules/ui/utilities/(page-title/components/__tests__/PageTitle|page-favicon/components/__tests__/PageTitle|page-favicon/components/__tests__/PageFavicon)\.test\.ts|packages/twenty-front/src/testing/mock-data/config\.ts|packages/twenty-front/src/utils/title-utils\.ts|packages/twenty-front/src/utils/__tests__/title-utils\.test\.ts|packages/twenty-front/src/modules/auth/components/Logo\.tsx|packages/twenty-front/src/modules/auth/sign-in-up/components/FooterNote\.tsx|packages/twenty-front/src/modules/auth/sign-in-up/components/__tests__/FooterNote\.test\.tsx|packages/twenty-front/src/modules/auth/sign-in-up/components/SignInUpGlobalScopeForm\.tsx|packages/twenty-front/src/modules/onboarding/components/OnboardingHeader\.tsx|packages/twenty-front/src/modules/onboarding/components/OnboardingPulsingLogo\.tsx|packages/twenty-front/src/modules/onboarding/components/import-contacts/OnboardingImportPreviewSyncBadge\.tsx|packages/twenty-front/src/pages/auth/SignInUp\.tsx|packages/twenty-front/src/pages/not-found/NotFound\.tsx|packages/twenty-front/src/modules/ui/navigation/navigation-drawer/(constants/DefaultWorkspace(Logo|Name)\.ts|components/MultiWorkspaceDropdown/internal/(MultiWorkspaceDropdownDefaultComponents|MultiWorkspaceDropdownClickableComponent)\.tsx|components/MultiWorkspaceDropdown/internal/components/AvailableWorkspaceItem\.tsx)|packages/twenty-front/src/pages/settings/admin-panel/(SettingsAdminUserDetail|SettingsAdminWorkspaceDetail)\.tsx|packages/twenty-front/src/modules/settings/admin-panel/components/SettingsAdminWorkspaceContent\.tsx|packages/twenty-front/src/modules/applications/(components/AppConnectionHeader\.tsx|hooks/useResolvedApplicationDescription\.ts)|packages/twenty-front/src/pages/settings/applications/utils/(getCustomApplicationDescription|getStandardApplicationDescription)\.ts|packages/twenty-front/src/pages/settings/community/SettingsCommunity\.tsx|packages/twenty-front/src/modules/settings/mcp-and-apis/(constants/McpSetup\.ts|utils/(mcpSetup\.ts|buildMcpSetupCategories\.tsx|__tests__/mcpSetup\.test\.ts)|components/SettingsMcpSetup\.tsx)|packages/twenty-front/src/pages/settings/legal/(SettingsLegalDpa|SettingsLegalDpaNew)\.tsx|packages/twenty-front/src/modules/settings/legal/components/SettingsDpaAgreementsTable\.tsx|packages/twenty-front/src/pages/settings/enterprise/SettingsEnterprise\.tsx|packages/twenty-front/src/modules/settings/billing/(hooks/(useBillingPortalSession|useHandleCheckoutSession|useSubmitSubscriptionPayment|useEndSubscriptionTrialPeriod)\.ts|components/AddPaymentMethodForm\.tsx|constants/SettingsBillingPlanComparisonRows\.ts)|packages/twenty-front/src/modules/spreadsheet-import/steps/components/MatchColumnsStep/components/ColumnGrid\.tsx|packages/twenty-shared/src/branding/.*|packages/twenty-shared/(package|project)\.json|packages/twenty-server/\.env\.example|packages/twenty-server/src/engine/core-modules/twenty-config/(config-variables|twenty-config\.module)\.ts|packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver\.service(\.spec)?\.ts|packages/twenty-server/src/engine/core-modules/client-config/(client-config\.entity|client-config\.controller\.spec|services/client-config\.service)\.ts|packages/twenty-client-sdk/src/metadata/generated/.*|packages/twenty-server/src/engine/core-modules/workspace/workspace\.resolver\.ts)$'

email_allowed='^(packages/twenty-front/src/locales/([^/]+\.po|generated/[^/]+\.ts)|docs/provenance/(transactional-email-branding-ledger|server-public-presentation-ledger)\.md|packages/twenty-emails/src/(components/.*|emails/.*|index\.ts|locales/([^/]+\.po|generated/[^/]+\.ts)|utils/(brand|preview-brand)\.ts|constants/DefaultWorkspaceLogo\.ts)|packages/twenty-server/src/engine/core-modules/i18n/locales/([^/]+\.po|generated/[^/]+\.ts)|packages/twenty-server/src/engine/core-modules/email/(utils/(build-email-sender\.ts|__tests__/build-email-sender\.util\.spec\.ts)|__tests__/email-templates-rendering\.spec\.ts)|packages/twenty-server/src/engine/core-modules/admin-panel/services/admin-panel-server-admin\.service\.ts|packages/twenty-server/src/engine/core-modules/approved-access-domain/services/approved-access-domain\.(service|spec)\.ts|packages/twenty-server/src/engine/core-modules/auth/services/(auth|reset-password)\.service\.ts|packages/twenty-server/src/engine/core-modules/billing/reminders/services/billing-reminder\.service\.ts|packages/twenty-server/src/engine/core-modules/email-verification/services/email-verification\.service\.ts|packages/twenty-server/src/engine/core-modules/workspace-invitation/services/workspace-invitation\.service\.ts|packages/twenty-server/src/engine/workspace-manager/workspace-cleaner/services/cleaner\.workspace-service\.ts|packages/twenty-server/src/engine/core-modules/emailing-domain/(services/unsubscribe-content\.service(\.spec)?\.ts|types/(emailing-public-page-brand\.type\.ts|__tests__/emailing-public-page-brand\.type\.spec\.ts)|utils/(build-emailing-public-page-markup\.util\.ts|build-unsubscribe-(html-footer|preferences-page|result-page|text-footer)\.util\.ts|__tests__/(build-emailing-public-page-markup\.util\.spec|build-unsubscribe-preferences-page\.util\.spec)\.ts))|packages/twenty-server/src/modules/emailing/controllers/unsubscribe\.controller(\.spec)?\.ts)$'

distribution_allowed='^(README\.md|docs/provenance/distribution-display-ledger\.md|packages/twenty-docker/.*|packages/twenty-docs/(README\.md|docs\.json|package\.json)|packages/twenty-codex-plugin/(README\.md|package\.json))$'

scanner_allowed='^(docs/provenance/(brand-touchpoint-ledger\.json|brand-residue-gate\.md)|scripts/branding/.*|\.github/workflows/ci-brand-residue\.yml)$'

legal_allowed='^(docs/legal/mhoo/v2\.0/(01-mhoo-master-terms-v2\.0\.md|02-mhoo-privacy-policy-v2\.0\.md|03-mhoo-acceptable-use-policy-v2\.0\.md|04-mhoo-open-source-notice-v2\.0\.md|05-mhoo-dpa-availability-notice-v2\.0\.md|06-mhoo-legal-approval-record-v2\.0\.md|mhoo-legal-packet-manifest-v2\.0\.json)|docs/provenance/mhoo-legal-packet-v2\.0\.md|scripts/legal/(verify_mhoo_legal_packet|generate_mhoo_legal_sources|test_verify_mhoo_legal_packet)\.py|packages/twenty-front/src/pages/legal/(LegalDocumentApp\.tsx|LegalDocumentPage\.tsx|legal-document-config\.ts|legal-document-sources\.generated\.ts|__tests__/LegalDocumentPage\.test\.tsx)|packages/twenty-front/src/modules/app/components/(DomainShell|__tests__/DomainShell\.test)\.tsx|packages/twenty-shared/src/types/AppPath\.ts)$'

git diff --name-only "$base" "$head" | while IFS= read -r path; do
  [[ "$path" =~ $allowed || "$path" =~ $email_allowed || "$path" =~ $distribution_allowed || "$path" =~ $scanner_allowed || "$path" =~ $legal_allowed ]] || { printf 'trajectory fixture rejected: %s\n' "$path" >&2; exit 1; }
done

assert_manual_only_workflow() {
  local workflow="$1"
  local workflow_contents

  workflow_contents="$(git show "${head}:${workflow}" 2>/dev/null)" || {
    printf 'trajectory fixture rejected: missing workflow at %s: %s\n' "$head" "$workflow" >&2
    exit 1
  }

  if grep -Eq '^[[:space:]]*pull_request_target[[:space:]]*:' <<<"$workflow_contents"; then
    printf 'trajectory fixture rejected: pull_request_target restored: %s\n' "$workflow" >&2
    exit 1
  fi

  awk '
    /^on:[[:space:]]*(#.*)?$/ { in_on = 1; next }
    in_on && /^[^[:space:]#]/ { in_on = 0; next }
    in_on && /^[[:space:]]*($|#)/ { next }
    in_on && /^  workflow_dispatch:[[:space:]]*(#.*)?$/ {
      workflow_dispatch_count++
      next
    }
    in_on { invalid_event = 1; in_on = 0 }
    END { exit(workflow_dispatch_count == 1 && !invalid_event ? 0 : 1) }
  ' <<<"$workflow_contents" || {
    printf 'trajectory fixture rejected: workflow must expose only workflow_dispatch: %s\n' "$workflow" >&2
    exit 1
  }
}

assert_manual_only_workflow .github/workflows/pr-review-dispatch.yaml
assert_manual_only_workflow .github/workflows/external-contributor-pr-auto-draft.yaml

scripts/provenance/verify-source.sh "$head"
printf 'trajectory exact-head fixture passed\n'
