# Linear issue status lookup — MHO-267

ARCHITECTURE IMPACT: LOCAL

Source owner: `mhoo-os/mhoo-twenty-next`, existing
`packages/twenty-apps/public/linear`. Base `8d0bbe1eaf435b4448f54768e516f82671d871d7`;
initial inspection baseline `5f6cdd318b6a0d5db85b1a12f54e2aaffb65b035`.
No legacy source, duplicate App, new dependency, role or provider scope.

The new `get-linear-issue-status` tool accepts only `{ identifier: "ENG-123" }`.
The handler rejects additional selectors, URLs, whitespace and oversized inputs.
It uses the existing `listConnections({ providerName: 'linear' })` helper and
workspace-first selection, then one fixed query with a variable. No account
fallback, search, pagination, retry, persistence or webhook. Provider request
has a 10-second abort and rejects redirects; the function has a 15-second limit.
The shared GraphQL helper gains optional signal support and HTTP status metadata;
existing calls without that option retain their fetch policy and error strings.

The result projects identifier/title, provider status ID/name, nullable assignee
ID/name and the provider's canonical HTTPS Linear source URL. Unknown fields and
raw provider/metadata error details are not returned. Explicit failure codes are
INVALID_INPUT, NOT_CONNECTED, DISCONNECTED, CONNECTION_UNAVAILABLE, NOT_FOUND,
FORBIDDEN and PROVIDER_FAILURE. Missing issue is not evidence of its absence
outside the current connection's visibility. Partial GraphQL failure is never
reported as successful data. SDK metadata errors are flattened into strings, so
CONNECTION_UNAVAILABLE does not invent a narrower permission verdict.

Twenty's application-connections resolver derives App/Workspace/user from auth;
its list service restricts personal credentials when a request user exists.
Tool execution and installed user context require their own runtime acceptance.
No new public HTTP, workflow or unattended trigger is added. App argument values
never grant authority. The unchanged default role grants no object/settings access.

Provider contract: <https://linear.app/developers/graphql> documents direct
`issue(id: "BLA-123")` lookup and checking GraphQL errors before using partial data.
The selected query requests only identifier, title, url, state and assignee.
No live provider request was made for this increment.

## Compatibility and validation

The existing package is `@twentyhq/linear` 0.1.0, with SDK/client 2.31.0 in its
unchanged lockfile. An isolated immutable install, 40 mocked unit tests, package
lint/typecheck and native `twenty dev:build` pass. Initial typecheck rejected
SDK-unsupported maxLength/pattern schema fields; these were removed from metadata,
while actual input validation remains in the handler. Existing SDK deprecation
warnings remain; no version bump or dependency upgrade is included.

Read-only native settings observation on September 8, 2026 Bangkok confirmed
installed Linear is NPM version 0.1.6, seven functions and one front component.
The UI did not bind that installation to a package tarball/source revision.
Therefore this source package is NOT established as the installed revision.
Exact installed package/source compatibility, approved upgrade/rollback and
installed tool permissions must be established before any installation claim.
No install, provider connection, grant, data read or production mutation occurred.

Retained worker `01a075f0-61f8-7f12-a4bc-392bc251a108`; native coordinating head
`01a07aa7-944a-70c3-bf77-d51b9fc766f2`; Connectors tracks installed acceptance.
Existing MHO-267 issue ledger preserves the mapping gap and actual sign-in receipt.
Source proofs invalidate on relevant source/dependency changes; installed metadata
observations invalidate on upgrade/reinstallation. Routine scoped delivery follows
accepted standing authority; installed effects remain separate.
