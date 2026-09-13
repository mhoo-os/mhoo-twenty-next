# Hass manual consumer: synthetic source proof

ARCHITECTURE IMPACT: CROSS-SYSTEM

Date: 2026-09-07. Base: `d267e1b155ccdd8e5a3e1f0375934535e12dba11`.
Authority: the owner accepted the native manual-token and same-origin design
and authorized this first synthetic source slice through the voice coordinator.
ADR-0013 and the reuse ledger in the coordination worktree record acceptance.
This receipt does not authorize production, real credentials or invitations.

## Delivered source

- Additive `manualToken` manifest/SDK contract. Native converter retains null
  OAuth config; server validation rejects mixed kinds and kind changes.
- Intake resolves the existing Finance App universal identifier and manual
  provider in the authenticated Workspace. It requires an assigned App role,
  saves an App/provider-bound account with native encryption and transaction,
  and never imports/relabels old Clover rows. Existing unbound rows block a
  second connection instead of being silently adopted.
- Native App retrieval checks exact App/provider/Workspace, current initiator
  membership, owner/visibility, and intersection of user and App connection
  permissions. Missing App role, archived/failed grants, background invocation
  and malformed ciphertext deny. Manual retrieval never invokes OAuth refresh.
- Existing SDK connection helpers default to application identity. Added
  explicit `runAs: 'user'` to list/get, with no App-token fallback in that mode.
  Finance uses that option; default callers remain unchanged.
- Existing Finance App gains one server function, manual provider and narrow
  App role ceiling. Fixed Clover merchant GET, no redirects/retries, bounded
  response and timeout, explicit unknown scope verification, safe error/result.
  No route/tool/cron/workflow trigger is published in this slice.
- Native disconnect checks connection permission for manual providers, uses
  existing lifecycle deletion, and makes subsequent consumption fail. Existing
  non-OAuth revoke guard is reused. Provider-side revocation is not claimed.

## Passing evidence

| Check | Result and limits |
| --- | --- |
| Server focused Jest | 60 tests / 6 suites pass, including 3 PostgreSQL cases. |
| SDK provider and connection helpers | 17 tests / 2 suites pass; explicit delegated identity and missing-user-token denial included. |
| Finance manifest and fixtures | 10 tests / 2 suites pass using isolated alias config below. |
| Native server typecheck | `tsgo --noEmit -p packages/twenty-server/tsconfig.json` passes. |
| Changed Finance source typecheck | Focused config below passes; not a full App build. |
| Changed-file Oxlint | Server, SDK, shared and Finance configs: zero errors/warnings. |
| Provenance | `scripts/provenance/verify-source.sh` passes upstream commit `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`, tree `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`. |
| Coordination | Document validation and 16 governance tests pass. |

`clover-consumer.spec.ts` runs actual intake, native reader, actual native role
intersection and disconnect, plus the real Finance handler and SDK helpers.
Repositories/cache and HTTP transport are synthetic: the metadata transport
checks delegated identity then dispatches to the real reader. It does not
verify a signed JWT, bootstrap a Nest application, execute through the complete
native function executor, or prove live authorization middleware.

`clover-token.postgres.spec.ts` uses a dedicated local disposable database.
Credential/provider column and check definitions are derived from native
metadata, with explicit native cascade relationships. Identity dependencies
remain projections; this is not a complete deployed Twenty schema. It proves
race/idempotency, rollback, native ciphertext rejection and provider-delete
cascade with actual PostgreSQL. No runtime migrations or user data were touched.

## Reproduction

From the repository root, build shared declarations and the affected SDK
bundles/declarations with their existing Vite/tsgo/rollup configurations first.
Run `node node_modules/jest/bin/jest.js --config
packages/twenty-server/jest.config.mjs --runInBand --runTestsByPath` with:

- `packages/twenty-server/src/engine/core-modules/clover-token/clover-consumer.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.service.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.controller.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/clover-token.postgres.spec.ts`
- `packages/twenty-server/src/engine/core-modules/clover-token/manual-provider-validation.spec.ts`
- `packages/twenty-server/src/engine/core-modules/application/application-manifest/converters/__tests__/from-connection-provider-manifest-to-universal-flat-connection-provider.util.spec.ts`

Set `CLOVER_TEST_DATABASE_URL` only to the disposable localhost database named
`mhoo_hass_synthetic`. This run used an isolated `postgres:16` container on
127.0.0.1:55439 with synthetic local-only trust authentication. The test rejects
other hostname/database names. The container is removed after proof.

In `packages/twenty-sdk`, use `vitest run --config vitest.unit.config.ts` with
`src/sdk/define/connection-providers/__tests__/define-connection-provider.spec.ts`
and `src/sdk/logic-function/connections/__tests__/get-connection.spec.ts`.

The checked-out Finance package's normal Vitest config could not resolve its
`vite-tsconfig-paths` dependency in this environment. No dependencies were
installed. An isolated temporary Vitest config used the existing monorepo
runner, Finance as root, an absolute `src` alias to its source, and
`test.include: ['src/**/*.test.ts']`. The ordinary direct whole-App tsgo attempt
also encountered existing JSX/generated-reference setup requirements; it is
not reported as passing. Focused typecheck extends Finance tsconfig, clears
`references` and `include`, sets `composite: false` and `noEmit: true`, and lists
only application.config.ts, the new provider, role, and both merchant-read files.
These temporary configs alter no product config or dependency versions.

## Remaining boundaries

Same-origin session implementation and signed native invitation/login switching
remain next. Also absent: full isolated native bootstrap/executor proof, provider
scope verification, persistent marking of a failed provider lookup, real
provider disconnect/revocation proof, key rotation/recovery and backup leak
inspection, installed-App plan/apply, image/runtime/release proof and activation.
The `scopeVerification` marker is in the Finance result; no shared GraphQL DTO
field was needed in this first slice. Manual read scopes remain unknown.
No claim of a ready onboarding link follows from these tests.
