# Hass native Clover intake

Architecture impact: CROSS-SYSTEM. Source implementation candidate, 2026-09-06.
Not deployed. The owner approved the bounded live-source amendment in
`mhoo/ADR/0013-clover-secure-handoff.md`; this change starts at
`07ee3f49a3f5fb6ff9129c1867e7ec8469b59c77` without importing legacy commits.
The exact upstream v2.37.0 ancestry is unchanged.

## Behavior and ownership

The Cloudflare guide links to native Twenty Settings → Accounts. Twenty owns
Google sign-in, the email-bound Workspace invitation, membership, permissions,
the short-lived request, and encrypted ConnectedAccount storage. The guide and
D1 never receive the credential. No provider synchronization is started.

The feature defaults off. Only `CLOVER_TOKEN_WORKSPACE_ID` enables one native
Workspace UUID. `CLOVER_TOKEN_INVITEE_EMAIL` selects the approved invitation
recipient; neither setting grants membership or permission. An administrator
with native connection and member-management permissions can prepare the
existing native invitation without sending email or returning its bearer value.
The recipient must complete native sign-in and membership resolution.

The REST controller rejects noninteractive principals and requires an explicit
native bearer session. Every operation checks the active native Workspace,
current membership and `CONNECTED_ACCOUNTS` setting permission. The browser
cannot select a Workspace by supplying an ID in the request body.

`POST /clover-token/begin` creates a ten-minute native AppToken bound to the
user, user-Workspace membership, Workspace and 13-character merchant ID. A new
request revokes that member's older forms. At most five requests can be started
per user and Workspace within ten minutes.

`POST /clover-token/submit` rechecks authorization and locks the Workspace,
membership and request. It performs one bounded GET of the fixed Clover US
production merchant endpoint, checks the returned merchant ID, then encrypts
with the existing Workspace-bound `enc:v2` primitive before storing a
ConnectedAccount. Request consumption and connection creation share one native
PostgreSQL transaction. Concurrent retries receive the same non-secret receipt.
Unexpected provider/database errors are discarded, not echoed.

The merchant confirms all six Read permissions and no Write permissions. A
successful merchant GET proves that merchant lookup works; it does **not** prove
the complete permission set. Accordingly, scopes remain null and the product
must not claim independent scope verification. This is single-merchant manual
intake, not the Finance App's OAuth connection or a sync-ready integration.

The password input is cleared before awaiting submission and when the Workspace
changes. Clover credentials never enter Apollo, browser persistence, URLs or
guide storage. Lost responses trigger a receipt GET without resending the token.
The form is excluded from replay, and the REST path/provider request are
excluded from Sentry HTTP capture. Native secret/key custody is unchanged.

## Data and lifecycle

No schema migration: `provider` and AppToken `type` are existing text columns;
handoff metadata uses existing JSONB. There is no second credential table or key.
AppToken contains only merchant/member/connection identifiers and timestamps.
The encrypted credential follows native ConnectedAccount ownership and deletion.
The owner can revoke the grant in Clover. Deleting a local connection does not
revoke the provider grant or erase retained encrypted backups. No shorter backup
retention or automatic provider revocation is claimed.

## Local evidence

- 17 service tests: Workspace-bound encryption, wrong-Workspace rejection,
  membership and permission denial, expiry/revocation, idempotency, rate limits,
  wrong merchant, safe provider errors and failed persistence.
- 12 controller tests: interactive identity, role-gated native invitation,
  bounded responses and DTO validation.
- 2 real PostgreSQL transaction tests: concurrent submissions create one
  connection/provider lookup; failed request consumption rolls back the insert.
  These use synthetic entity projections, not a full native lifecycle migration.
- 4 frontend tests: disabled state, clearing before submission, lost-response
  recovery and Workspace-switch cleanup.
- Front/server typechecks and focused type-aware lint/format checks passed.
- Native server/front production builds and source ancestry verification passed.

Reproduce the focused backend tests with package Jest and
`src/engine/core-modules/clover-token/*.spec.ts`. The PostgreSQL suite skips unless
`CLOVER_TEST_DATABASE_URL` points to the explicitly named disposable localhost
database `mhoo_hass_synthetic`. Use synthetic values only. Frontend tests are in
`SettingsCloverConnection.test.tsx`. Build the normal Nx targets; the local Node
24 barrel-generator retained workers, so local builds used completed dependency
outputs and `--excludeTaskDependencies` without changing upstream scripts.

## Runtime activation still required

1. Restore the existing Coolify administration path. Both the operator's Chrome
   and the owner reported `ERR_CONNECTION_CLOSED` at `admin.mhoo.app` on
   2026-09-06. No alternate deployment mechanism is selected by this failure.
2. Produce a reviewed immutable application image and the Infrastructure-owned
   release/recovery receipt. Deploy server and worker from the same digest,
   initially leaving the two Clover settings empty. Verify native module startup
   and existing Workspace behavior; local builds alone do not prove these.
3. Verify existing Workspace subdomain and arrange protected root, existing
   Workspace and Hass routes with the current deployment owner. The observed
   runtime has `IS_MULTIWORKSPACE_ENABLED=false`; `hass.mhoo.app` and
   `mhoo.mhoo.app` did not resolve. Do not flip multi-Workspace mode or create a
   second Workspace before the routing transition is verified.
4. Create Hass Kitchen through native Twenty's administrator-controlled
   Workspace lifecycle. Record its real UUID and verify the intended role has
   connection-management permission. Keep unrelated Workspace membership private.
5. Set the two environment-only Clover settings through the existing deployment
   secret/config delivery mechanism. Preserve native encryption keys and tested
   recovery custody; never display or export their values. Prepare the approved
   native invitation. Sending email is a separate user-facing action.
6. Prove native Google onboarding into Hass, wrong-identity/Workspace denial,
   direct-origin protection, encrypted durable storage and absence of synthetic
   credential leakage across logs, responses, browser storage and recovery
   exports. Verify the actual merchant and Read-only settings. Do not use a
   real token as a debug fixture or expose it through automation/model output.
7. Publish the guide's native CTA/security copy only after those runtime checks.
   Record the exact Worker version and native image digest together.

Disabling `CLOVER_TOKEN_WORKSPACE_ID` closes intake without removing data. A code
rollback does not undo Workspace creation, DNS, invitations or stored grants.
An older image does not know the new provider value; compatibility with new
rows must be proved before rollback. Do not delete credentials or Workspaces
to make an unproved rollback appear successful.
