# Clean-foundation overlay

The base is upstream `twentyhq/twenty` at `refs/tags/twenty/v2.37.0`, commit
`6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`, tree
`3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`.

`mhoo-os/mhoo-twenty` is legacy evidence only. Its frozen main receipt is
`cbf80755521cee7b0e3fbea0c9d17eaf7582b1a7`; no legacy commit is merged or
cherry-picked into this repository.

Initial permitted overlay paths:

- `.twenty-source`
- `CLAUDE.md` (also reached through the upstream `AGENTS.md` symlink)
- `docs/provenance/clean-foundation-overlay.md`
- `scripts/provenance/verify-source.sh`

Later overlay commits append trajectory evaluation and the clean runtime CI to
this list. Nothing else is implicitly permitted.

Documentation-drift control paths:

- `.github/workflows/ci-app-docs-drift.yaml`
- `scripts/docs/check_app_docs_drift.py`
- `scripts/docs/test_app_docs_drift.py`

Trajectory-eval paths:

- `.agents/trajectory-review.json`
- `.agents/skills/pr-trajectory-audit/SKILL.md`
- `.agents/skills/pr-trajectory-audit/references/failure-patterns.md`
- `.agents/skills/pr-trajectory-audit/scripts/exact-head-fixture.sh`
- `.agents/skills/pr-trajectory-audit/scripts/exact-head-fixture.test.sh`
- `.github/workflows/trajectory-eval.yml`

MHO-146 Phase A source authorization:

- MHO-259 owner-authorized loader authentication source repair permits
  `packages/twenty-front-component-renderer/src/host/component-source/utils/fetchComponentSourceFromNetwork.ts`,
  `fetchJavaScriptModuleSourceText.ts` and their corresponding tests in that
  directory's `__tests__/`, plus
  `scripts/provenance/front-component-cookie-browser.cjs` and
  `docs/provenance/front-component-cookie-auth.md`. Scope: same-origin code
  loading through an existing authenticated edge, preserving cross-origin
  cookie omission and storage handoff isolation. This authorizes no Access
  policy change, deployment, or expanded App record permissions.

- `packages/twenty-apps/internal/mhoo-finance/` is the exact internal App
  subtree authorized for the fixture-first Finance Phase A slice in PR #22.
  It contains only the native Twenty Finance objects, views, navigation,
  dashboard, deterministic synthetic fixtures, focused tests, and their
  source documentation. Authorization of this subtree does not authorize a
  neighboring App, provider/OAuth integration, credentials, real data,
  installation, deployment, or production mutation.
- `.github/workflows/ci-create-app-e2e-minimal.yaml` is the exact workflow
  path retained for the upstream create-app publish/scaffold integration
  check. Merged PR #21 changed only its unavailable runner label to the
  available `ubuntu-latest` runner; the path is authorized here solely to
  preserve that CI runner compatibility adjustment. This does not authorize
  another workflow, trigger, deployment, credential, or product path.

These are exact source-custody boundaries. A path that is adjacent, nested
under another root, has a suffix or lookalike name, or belongs to another App
or workflow remains rejected by the trajectory fixture.

Upstream dispatch boundary paths:

- `.github/workflows/pr-review-dispatch.yaml`
- `.github/workflows/external-contributor-pr-auto-draft.yaml`

These files are retained solely so this fork can synchronize with upstream
Twenty. In the Mhoo fork they are inert: they expose only manual dispatch and
their TwentyHQ-only job predicates prevent a manual run from dispatching work.

Clean runtime paths:

- `.github/workflows/clean-foundation-ci.yml`
- `.github/workflows/clean-foundation-image.yml`
- `deploy/twenty-next/compose.yaml`
- `deploy/twenty-next/env/validation.env.example`

Rebrand source paths authorized by the accepted MHO-153 contract:

- `packages/twenty-front/public/images/mhoo/`
- `packages/twenty-shared/src/branding/`
- `packages/twenty-shared/package.json`
- `packages/twenty-shared/project.json`
- `scripts/generate_mhoo_assets.py`
- `scripts/verify_mhoo_assets.py`
- `packages/twenty-server/.env.example`
- `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`
- `packages/twenty-server/src/engine/core-modules/twenty-config/twenty-config.module.ts`
- `packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver.service.ts`
- `packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver.service.spec.ts`
- `packages/twenty-server/src/engine/core-modules/client-config/client-config.entity.ts`
- `packages/twenty-server/src/engine/core-modules/client-config/client-config.controller.spec.ts`
- `packages/twenty-server/src/engine/core-modules/client-config/services/client-config.service.ts`
- `packages/twenty-front/src/modules/client-config/components/ClientConfigProviderEffect.tsx`
- `packages/twenty-front/src/modules/client-config/components/__tests__/ClientConfigProviderEffect.test.tsx`
- `packages/twenty-front/src/modules/client-config/hooks/useClientConfig.ts`
- `packages/twenty-front/src/modules/client-config/hooks/__tests__/useClientConfig.test.tsx`
- `packages/twenty-front/src/modules/client-config/states/brandState.ts`
- `packages/twenty-front/src/modules/client-config/states/clientConfigApiStatusState.ts`
- `packages/twenty-front/src/modules/client-config/types/ClientConfig.ts`
- `packages/twenty-front/src/generated-metadata/graphql.ts`
- `packages/twenty-client-sdk/src/metadata/generated/`
- `packages/twenty-front/src/testing/mock-data/config.ts`

Browser shell paths:

- `packages/twenty-front/index.html`
- `packages/twenty-front/public/manifest.json`
- `packages/twenty-front/src/modules/ui/utilities/page-title/components/PageTitle.tsx`
- `packages/twenty-front/src/modules/ui/utilities/page-title/components/__tests__/PageTitle.test.ts`
- `packages/twenty-front/src/modules/ui/utilities/page-favicon/components/PageFavicon.tsx`
- `packages/twenty-front/src/modules/ui/utilities/page-favicon/components/__tests__/PageFavicon.test.ts`
- `packages/twenty-front/src/utils/title-utils.ts`
- `packages/twenty-front/src/utils/__tests__/title-utils.test.ts`
- `docs/provenance/browser-shell-policy.md`
- `packages/twenty-server/src/engine/core-modules/client-config/client-config.entity.ts`
- `packages/twenty-server/src/engine/core-modules/client-config/client-config.controller.spec.ts`
- `packages/twenty-server/src/engine/core-modules/client-config/services/client-config.service.ts`
- `packages/twenty-front/src/modules/client-config/components/ClientConfigProviderEffect.tsx`
- `packages/twenty-front/src/modules/client-config/components/__tests__/ClientConfigProviderEffect.test.tsx`
- `packages/twenty-front/src/modules/client-config/hooks/useClientConfig.ts`
- `packages/twenty-front/src/modules/client-config/hooks/__tests__/useClientConfig.test.tsx`
- `packages/twenty-front/src/modules/client-config/states/brandState.ts`
- `packages/twenty-front/src/modules/client-config/states/clientConfigApiStatusState.ts`
- `packages/twenty-front/src/modules/client-config/types/ClientConfig.ts`
- `packages/twenty-front/src/generated-metadata/graphql.ts`
- `packages/twenty-front/src/testing/mock-data/config.ts`
Workspace presentation policy paths:

- `packages/twenty-shared/src/branding/workspace-presentation.ts`
- `packages/twenty-shared/src/branding/__tests__/brand-presets.test.ts`
- `packages/twenty-server/src/engine/core-modules/workspace/workspace.resolver.ts`
- `docs/provenance/workspace-presentation-policy.md`

Auth, onboarding, and pre-auth presentation paths:

- `docs/provenance/auth-onboarding-touchpoint-ledger.md`
- `packages/twenty-front/src/locales/`
- `packages/twenty-front/src/locales/generated/`
- `packages/twenty-front/src/modules/auth/components/Logo.tsx`
- `packages/twenty-front/src/modules/auth/sign-in-up/components/FooterNote.tsx`
- `packages/twenty-front/src/modules/auth/sign-in-up/components/__tests__/FooterNote.test.tsx`
- `packages/twenty-front/src/modules/onboarding/components/OnboardingHeader.tsx`
- `packages/twenty-front/src/modules/onboarding/components/OnboardingPulsingLogo.tsx`
- `packages/twenty-front/src/modules/onboarding/components/import-contacts/OnboardingImportPreviewSyncBadge.tsx`
- `packages/twenty-front/src/pages/auth/SignInUp.tsx`
- `packages/twenty-front/src/pages/not-found/NotFound.tsx`

Authenticated UI and customer-copy presentation paths:

- `docs/provenance/authenticated-ui-touchpoint-ledger.md`
- `packages/twenty-front/src/modules/client-config/hooks/useResolvedBrand.ts`
- `packages/twenty-front/src/modules/client-config/utils/getBrandUrl.ts`
- `packages/twenty-front/src/modules/client-config/utils/__tests__/getBrandUrl.test.ts`
- `packages/twenty-front/src/modules/workspace/utils/getWorkspacePresentation.ts`
- `packages/twenty-front/src/modules/workspace/utils/__tests__/getWorkspacePresentation.test.ts`
- `packages/twenty-front/src/modules/ui/navigation/navigation-drawer/constants/DefaultWorkspaceLogo.ts`
- `packages/twenty-front/src/modules/ui/navigation/navigation-drawer/constants/DefaultWorkspaceName.ts`
- `packages/twenty-front/src/modules/ui/navigation/navigation-drawer/components/MultiWorkspaceDropdown/internal/MultiWorkspaceDropdownDefaultComponents.tsx`
- `packages/twenty-front/src/modules/ui/navigation/navigation-drawer/components/MultiWorkspaceDropdown/internal/MultiWorkspaceDropdownClickableComponent.tsx`
- `packages/twenty-front/src/modules/ui/navigation/navigation-drawer/components/MultiWorkspaceDropdown/internal/components/AvailableWorkspaceItem.tsx`
- `packages/twenty-front/src/modules/auth/sign-in-up/components/SignInUpGlobalScopeForm.tsx`
- `packages/twenty-front/src/pages/settings/admin-panel/SettingsAdminWorkspaceDetail.tsx`
- `packages/twenty-front/src/pages/settings/admin-panel/SettingsAdminUserDetail.tsx`
- `packages/twenty-front/src/modules/settings/admin-panel/components/SettingsAdminWorkspaceContent.tsx`
- `packages/twenty-front/src/modules/applications/components/AppConnectionHeader.tsx`
- `packages/twenty-front/src/modules/applications/hooks/useResolvedApplicationDescription.ts`
- `packages/twenty-front/src/pages/settings/applications/utils/getStandardApplicationDescription.ts`
- `packages/twenty-front/src/pages/settings/applications/utils/getCustomApplicationDescription.ts`
- `packages/twenty-front/src/pages/settings/community/SettingsCommunity.tsx`
- `packages/twenty-front/src/modules/settings/mcp-and-apis/constants/McpSetup.ts`
- `packages/twenty-front/src/modules/settings/mcp-and-apis/utils/mcpSetup.ts`
- `packages/twenty-front/src/modules/settings/mcp-and-apis/utils/buildMcpSetupCategories.tsx`
- `packages/twenty-front/src/modules/settings/mcp-and-apis/utils/__tests__/mcpSetup.test.ts`
- `packages/twenty-front/src/modules/settings/mcp-and-apis/components/SettingsMcpSetup.tsx`
- `packages/twenty-front/src/pages/settings/legal/SettingsLegalDpa.tsx`
- `packages/twenty-front/src/pages/settings/legal/SettingsLegalDpaNew.tsx`
- `packages/twenty-front/src/modules/settings/legal/components/SettingsDpaAgreementsTable.tsx`
- `packages/twenty-front/src/pages/settings/enterprise/SettingsEnterprise.tsx`
- `packages/twenty-front/src/modules/settings/billing/hooks/useBillingPortalSession.ts`
- `packages/twenty-front/src/modules/settings/billing/hooks/useHandleCheckoutSession.ts`
- `packages/twenty-front/src/modules/settings/billing/hooks/useSubmitSubscriptionPayment.ts`
- `packages/twenty-front/src/modules/settings/billing/hooks/useEndSubscriptionTrialPeriod.ts`
- `packages/twenty-front/src/modules/settings/billing/components/AddPaymentMethodForm.tsx`
- `packages/twenty-front/src/modules/settings/billing/constants/SettingsBillingPlanComparisonRows.ts`
- `packages/twenty-front/src/modules/spreadsheet-import/steps/components/MatchColumnsStep/components/ColumnGrid.tsx`

Transactional email branding and sender identity paths:

- `docs/provenance/transactional-email-branding-ledger.md`
- `packages/twenty-emails/src/components/`
- `packages/twenty-emails/src/emails/`
- `packages/twenty-emails/src/index.ts`
- `packages/twenty-emails/src/locales/`
- `packages/twenty-emails/src/utils/brand.ts`
- `packages/twenty-emails/src/utils/preview-brand.ts`
- `packages/twenty-emails/src/constants/DefaultWorkspaceLogo.ts`
- `packages/twenty-server/src/engine/core-modules/email/utils/build-email-sender.ts`
- `packages/twenty-server/src/engine/core-modules/email/utils/__tests__/build-email-sender.util.spec.ts`
- `packages/twenty-server/src/engine/core-modules/email/__tests__/email-templates-rendering.spec.ts`
- `packages/twenty-server/src/engine/core-modules/admin-panel/services/admin-panel-server-admin.service.ts`
- `packages/twenty-server/src/engine/core-modules/approved-access-domain/services/approved-access-domain.service.ts`
- `packages/twenty-server/src/engine/core-modules/approved-access-domain/services/approved-access-domain.spec.ts`
- `packages/twenty-server/src/engine/core-modules/auth/services/auth.service.ts`
- `packages/twenty-server/src/engine/core-modules/auth/services/reset-password.service.ts`
- `packages/twenty-server/src/engine/core-modules/billing/reminders/services/billing-reminder.service.ts`
- `packages/twenty-server/src/engine/core-modules/email-verification/services/email-verification.service.ts`
- `packages/twenty-server/src/engine/core-modules/workspace-invitation/services/workspace-invitation.service.ts`
- `packages/twenty-server/src/engine/workspace-manager/workspace-cleaner/services/cleaner.workspace-service.ts`

Server-public presentation paths:

- `docs/provenance/server-public-presentation-ledger.md`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/services/unsubscribe-content.service.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/types/__tests__/emailing-public-page-brand.type.spec.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-emailing-public-page-markup.util.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/utils/__tests__/build-emailing-public-page-markup.util.spec.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-html-footer.util.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-preferences-page.util.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/utils/__tests__/build-unsubscribe-preferences-page.util.spec.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-result-page.util.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/utils/build-unsubscribe-text-footer.util.ts`
- `packages/twenty-server/src/modules/emailing/controllers/unsubscribe.controller.ts`

Customer-brand residue gate paths:

- `docs/provenance/brand-touchpoint-ledger.json`
- `docs/provenance/brand-residue-gate.md`
- `scripts/branding/`
- `.github/workflows/ci-brand-residue.yml`

Approved Mhoo Legal Packet v2.0 paths:

- `docs/legal/mhoo/v2.0/`
- `docs/provenance/mhoo-legal-packet-v2.0.md`
- `scripts/legal/`
- `packages/twenty-front/src/pages/legal/`
- `packages/twenty-front/src/modules/app/hooks/useCreateRootAppRouter.tsx`
- `packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx`
- `packages/twenty-shared/src/types/AppPath.ts`
- `packages/twenty-emails/src/components/Footer.tsx`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type.ts`
- `packages/twenty-server/src/engine/core-modules/emailing-domain/types/__tests__/emailing-public-page-brand.type.spec.ts`
- `packages/twenty-front/src/modules/auth/sign-in-up/components/__tests__/FooterNote.test.tsx`

MHO-254 synthetic Finance evaluation paths:

- `evaluations/finance/mho-254/`

This path contains a synthetic-only parser benchmark, retained raw results,
candidate licensing/egress review, and an adoption recommendation. It adds no
runtime dependency, provider connection, customer data, deployment behavior,
or second financial source of truth.

These paths authorize source-level branding work only. They do not authorize
runtime deployment, publication, legal approval, or production mutation.


Hass native Clover intake source paths authorized by the owner's 2026-09-06
approval of ADR-0013's live-source amendment in the coordination repository:

- `packages/twenty-front/src/modules/accounts/utils/hasMissingCreateCalendarEventScopes.ts`
- `packages/twenty-front/src/modules/accounts/utils/hasMissingDraftEmailScopes.ts`
- `packages/twenty-front/src/modules/settings/accounts/components/SettingsCloverConnection.tsx`
- `packages/twenty-front/src/modules/settings/accounts/components/__tests__/SettingsCloverConnection.test.tsx`
- `packages/twenty-front/src/modules/ui/field/display/components/ActorDisplay.tsx`
- `packages/twenty-front/src/pages/settings/accounts/SettingsAccounts.tsx`
- `packages/twenty-server/src/engine/core-modules/app-token/app-token.entity.ts`
- `packages/twenty-server/src/engine/core-modules/auth/services/auth.service.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.controller.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.controller.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.module.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.postgres.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.service.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.service.ts`
- `packages/twenty-server/src/engine/core-modules/core-engine.module.ts`
- `packages/twenty-server/src/engine/core-modules/tool/tools/email-tool/utils/get-missing-draft-email-scopes.util.ts`
- `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`
- `packages/twenty-server/src/engine/core-modules/workspace-invitation/services/workspace-invitation.service.ts`
- `packages/twenty-server/src/instrument.ts`
- `packages/twenty-server/src/modules/calendar/calendar-event-creation-manager/utils/get-missing-create-event-scopes.util.ts`
- `packages/twenty-server/src/modules/connected-account/email-alias-manager/services/email-alias-manager.service.ts`
- `packages/twenty-server/src/modules/connected-account/refresh-tokens-manager/services/connected-account-refresh-tokens.service.ts`
- `packages/twenty-server/src/modules/messaging/message-outbound-manager/services/messaging-message-outbound.service.ts`
- `packages/twenty-shared/src/types/ConnectedAccountProvider.ts`
- `docs/provenance/hass-clover-intake.md`
- `packages/twenty-docs/developers/extend/apps/logic/connections.mdx`

This bounded overlay extends native Twenty authentication, invitations,
AppToken request state and ConnectedAccount encryption. It adds no separate
credential database, identity service, OAuth callback, provider sync, or legacy
import. The owner requested deployment; source authorization and local checks
still do not establish runtime readiness. The activation procedure and its
remaining evidence are recorded in `hass-clover-intake.md`.
## GraphQL edge authentication follow-up

The owner-authorized saved-sample integration requires native Core API reads
behind the existing same-origin edge login. Enumerated paths:

- `packages/twenty-front-component-renderer/src/types/HostFetchPolicy.ts`
- `packages/twenty-front-component-renderer/src/host/fetch/utils/createHostFetchEnforcingPolicy.ts`
- `packages/twenty-front-component-renderer/src/host/fetch/utils/buildHostFetchPolicyFromFrontComponentUrls.ts`
- Their exact `__tests__/<name>.test.ts` counterparts.
- `docs/provenance/front-component-graphql-edge-auth.md`

Only bearer-authenticated POST to the host-configured GraphQL URL may use
browser same-origin credentials. Other App fetches and redirect restrictions
retain their previous policy. This source permission is not deployed proof.

## MHO265 / MHO266 phased native source inventory

ADR-0014 in the coordination repository and the owner's phased-source approval
authorize the standalone `packages/twenty-apps/internal/mhoo-clover/` App subtree
(MHO266). MHO265 reuses native Connection custody, explicit background grants,
SDK retrieval and the previously approved opt-in Workspace session path. The
exact supplemental host and proof paths are below, matching the trajectory gate.
This is source admission, not live intake, provider access or activation.

- `docs/provenance/clover-background-grant-source-proof.md`
- `docs/provenance/clover-multimerchant-source-proof.md`
- `docs/provenance/clover-native-runtime-proof.md`
- `docs/provenance/clover-payment-persistence-source-proof.md`
- `docs/provenance/clover-standalone-source-proof.md`
- `docs/provenance/hass-manual-consumer-source-proof.md`
- `docs/provenance/same-origin-workspace-source-proof.md`
- `packages/twenty-front/src/modules/auth/effect-components/SignOutOnOtherTabSignOutEffect.tsx`
- `packages/twenty-front/src/modules/auth/hooks/useAuth.ts`
- `packages/twenty-front/src/modules/auth/utils/__tests__/crossTabSignOut.test.ts`
- `packages/twenty-front/src/modules/auth/utils/crossTabSignOut.ts`
- `packages/twenty-front/src/modules/client-config/states/isSameOriginWorkspaceEnabledState.ts`
- `packages/twenty-front/src/modules/domain-manager/hooks/useIsCurrentLocationOnAWorkspace.ts`
- `packages/twenty-front/src/modules/domain-manager/hooks/useRedirectToWorkspaceDomain.ts`
- `packages/twenty-sdk/src/sdk/define/connection-providers/__tests__/define-connection-provider.spec.ts`
- `packages/twenty-sdk/src/sdk/define/connection-providers/define-connection-provider.ts`
- `packages/twenty-sdk/src/sdk/logic-function/connections/__tests__/get-connection.spec.ts`
- `packages/twenty-sdk/src/sdk/logic-function/connections/get-connection.ts`
- `packages/twenty-sdk/src/sdk/logic-function/connections/list-connections.ts`
- `packages/twenty-sdk/src/sdk/logic-function/utils/post-graphql-request.util.ts`
- `packages/twenty-server/jest.config.mjs`
- `packages/twenty-server/src/database/commands/upgrade-version-command/2-37/2-37-instance-command-fast-1788751203788-add-manual-token-workspace-grant.ts`
- `packages/twenty-server/src/database/commands/upgrade-version-command/instance-commands.constant.ts`
- `packages/twenty-server/src/engine/core-modules/application/application-manifest/converters/__tests__/from-connection-provider-manifest-to-universal-flat-connection-provider.util.spec.ts`
- `packages/twenty-server/src/engine/core-modules/application/connection-provider/connections/application-connections.module.ts`
- `packages/twenty-server/src/engine/core-modules/application/connection-provider/connections/dtos/app-connection.object.ts`
- `packages/twenty-server/src/engine/core-modules/application/connection-provider/connections/services/application-connections-list.service.ts`
- `packages/twenty-server/src/engine/core-modules/application/connection-provider/connections/services/manual-token-workspace-grant.util.spec.ts`
- `packages/twenty-server/src/engine/core-modules/application/connection-provider/connections/services/manual-token-workspace-grant.util.ts`
- `packages/twenty-server/src/engine/core-modules/application/connection-provider/connections/types/manual-token-workspace-grant.type.ts`
- `packages/twenty-server/src/engine/core-modules/auth/auth.resolver.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-connection.constants.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-consumer.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-data-contract.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/manual-provider-validation.spec.ts`
- `packages/twenty-server/src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service.ts`
- `packages/twenty-server/src/engine/core-modules/two-factor-authentication/two-factor-authentication.resolver.spec.ts`
- `packages/twenty-server/src/engine/core-modules/two-factor-authentication/two-factor-authentication.resolver.ts`
- `packages/twenty-server/src/engine/metadata-modules/connected-account/connected-account-metadata.service.ts`
- `packages/twenty-server/src/engine/metadata-modules/connected-account/entities/connected-account.entity.ts`
- `packages/twenty-server/src/engine/metadata-modules/connected-account/resolvers/connected-account.resolver.ts`
- `packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/services/flat-connection-provider-validator.service.ts`
- `packages/twenty-server/test/integration/graphql/suites/auth/same-origin-workspaces.integration-spec.ts`
- `packages/twenty-server/test/integration/metadata/suites/application/clover-native-data.integration-spec.ts`
- `packages/twenty-shared/src/application/appConnectionType.ts`
- `packages/twenty-shared/src/application/connectionProviderManifestType.ts`
- `packages/twenty-shared/src/application/connectionProviderType.ts`

MHO266 CI admission also permits the exact `.github/workflows/ci-twenty-apps.yaml`
file to select the repository lockfile and build the current native SDK/client
for Clover's source-only checks. Other Apps retain their standalone dependency
workflow. The App consumes the modified native manual-token/grant contracts,
which are absent from the published 2.37 SDK. No dependency, trigger, credential
or deployment permission is added.
