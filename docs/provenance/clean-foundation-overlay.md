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

- `.github/workflows/ci-front.yaml` is authorized solely for replacing the
  unavailable `ubuntu-latest-8-cores` label with `ubuntu-latest` in the existing
  `front-build` and `front-sb-build` jobs. All commands, gates, dependencies,
  timeouts, heap settings, events and permissions remain unchanged. This adds
  no deployment, runner purchase or other workflow authority.

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

## AI editor lifecycle repair

The September 7 owner-authorized, source-only MHO-259 repair permits exactly:

- `packages/twenty-front/src/modules/advanced-text-editor/utils/hasEditorExtension.ts`
- `packages/twenty-front/src/modules/advanced-text-editor/utils/__tests__/hasEditorExtension.test.ts`
- `packages/twenty-front/src/modules/advanced-text-editor/hooks/useTurnIntoBlockOptions.ts`
- `packages/twenty-front/src/modules/advanced-text-editor/hooks/__tests__/useTurnIntoBlockOptions.test.tsx`
- `docs/provenance/ai-editor-lifecycle.md`

Scope is the confirmed AI instructions formatting-selector crash when a
previous editor has been destroyed. The shared helper safely rejects missing
or destroyed editors; the selector uses the current editor instance and emits
no options while it is unavailable. This authorizes no editor redesign,
dependency update, manifest/CORS change, Workspace mutation or deployment.

PR37 CI test-maintenance scope additionally permits exactly
`packages/twenty-front/src/testing/constants/UntestedAppPaths.ts` to classify
six public Legal App routes outside the authenticated navigation test matrix.
`DomainShell.test.tsx` already verifies these exact public routes bypass
WorkspaceApp. The exhaustive count assertion and production navigation behavior
remain unchanged; no adjacent test constants or hook implementation are included.

## Inherited upstream external-effect guards

ARCHITECTURE IMPACT: LOCAL

A normal main merge must not implicitly execute inherited upstream operations.
The source owner is `twentyhq/twenty`, pinned in `.twenty-source`; existing
workflows explicitly target `twentyhq/twenty-infra`, `twentyhq/twenty-factory`,
`twenty.api.crowdin.com` and `engineering.twenty.com`. The following exact
workflow jobs now require `github.repository == 'twentyhq/twenty'` before
performing those operations, retaining their existing conditions:

| Workflow | Guarded job/step | Existing effect |
| --- | --- | --- |
| cd-deploy-main.yaml | deploy-main | twenty-infra deployment dispatch |
| app-prod-parity-e2e-dispatch.yaml | dispatch | twenty-factory prod-parity dispatch and status |
| i18n-push.yaml | extract_translations | translation branch/PR, Twenty Crowdin and infra automerge |
| docs-i18n-push.yaml | push_docs | upstream documentation translation upload |
| website-i18n-push.yaml | extract_website_translations | upstream website translation upload |
| visual-regression-dispatch.yaml | dispatch-pixel-diff | twenty-factory visual comparison dispatch |
| post-ci-comments.yaml | dispatch-breaking-changes | twenty-factory breaking-changes comment dispatch |
| docs-i18n-pull.yaml | Eight Crowdin/writeback/infra steps only | upstream translation mutation, PR/branch push and automerge dispatch |
| ci-e2e-main.yaml | notify-main-ci-failure; QA Scout prepare/run/comment | upstream engineering notification and cloud-agent/context publication |

Each path is under `.github/workflows/` and is enumerated in the exact-head
fixture. This is a source execution guard, not deletion, account-level workflow
disabling, token rotation or a replacement integration. Local E2E/build/test jobs,
runner-local postcard installation and manual clean-foundation image semantics
are unchanged. QA preparation, the agent run and comment publication have direct
guards; downstream receipt-only steps retain their existing output conditions.

Source base: `6a1dec473a3d6c303697bca044e3e7d3681e7b72`. Retained Finance/shared-AI
executor prepares this isolated prerequisite for PR37; coordinating repo head
`01a07aa7-944a-70c3-bf77-d51b9fc766f2` owns independent review and publication
sequencing. Local validation compares parsed YAML to the exact base, allowing
only repository guards while preserving original predicates and all other
workflow structure; checks fork/upstream outcomes and rejects missing/OR-bypass
guards. Detailed inputs/results live in the protected upstream-workflow-guards
receipt folder. No existing source tests are rerun without changed inputs.

A push from the eventual merged revision reads its guarded workflows. Before
that merge, `workflow_run` callbacks use the existing default branch: publishing
this guard PR can still invoke the old post-CI dispatcher. Therefore this local
candidate does not itself prove safe pre-merge publication. The head must resolve
that concrete sequencing condition before publication, without relying on absent
secrets or implying production authorization. No publish/merge/deploy occurred in
this preparation. Re-evaluate if workflow source, default branch or event policy
changes; local validation is not a live GitHub execution claim.

Follow-up inventory found docs-i18n-pull also runs on schedules and PR paths. Its local generation/check steps remain intact; only the eight external mutation/writeback steps gain owner guards. Observed PR run34165536337 completed without invoking its non-PR Crowdin steps; this does not establish safety of scheduled runs.

## Native Linear issue status lookup

MHO-267 authorizes a bounded read-only tool in the existing public Linear App.
The exact-file allowance covers its identifier constant, tool/handler/mock test,
shared GraphQL helper/result metadata and `linear-issue-status.md` receipt only.
No App role, provider grant, manifest/version or runtime install change is included.
See [the source and installed-mapping limits](linear-issue-status.md).
