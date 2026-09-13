# Clover explicit native background grant — source proof

2026-09-07. Source and isolated synthetic proof only. No live credential grant,
production schema change, App installation, provider calls or sync activation.

## Native authorization contract

A nullable `manualTokenWorkspaceGrant` on native ConnectedAccount records is
absent by default. Workspace visibility alone remains insufficient for manual
background retrieval. The native controller requires an interactive bearer user
and rejects API keys/App tokens. Its grant operation checks current membership,
connection-management permission intersected with the installed Clover App role,
exact Workspace/App/provider/account binding, and the expected grant revision.
The existing Workspace/account transaction locks serialize grant changes.

Every enable creates a fresh UUID revision and records the explicit grantor,
server time and fixed read-sync purpose. Revoke preserves the revision with a
revocation time; a stale revision cannot overwrite a newer decision. Revocation
is allowed even when the selected account is archived/auth-failed. No token is
returned, copied or re-encrypted by the operation. Other connections are unchanged.

Manual background retrieval re-reads native custody, validates the exact grant
shape, denies revoked/future/malformed grants, and checks the grantor's current
membership and user/App permission intersection. Account archival, auth failure,
disconnect or missing App/provider denies access. OAuth behavior is unchanged.
The SDK returns the active grant revision as metadata only to the owning App.
The Clover background authorizer pins the queued revision and rejects replay
following revoke/regrant. Job payloads cannot create or broaden grants.

This does not revoke a token already delivered to in-flight trusted App code or
cancel an already issued provider request. No atomic revocation-at-import-commit
claim is made. Provider scope verification remains distinct: this source uses
bounded GET readers, but native grant metadata does not prove the token has no
provider Write scopes. Real activation still needs that provider evidence.

## Native schema and execution proof

The actual native generator emitted the sole additive nullable JSONB column
and registered the fast instance command at timestamp 1788751203788. It was
applied to the disposable native database. A native App compatibility test
correctly refused the still-behind synthetic Workspace; running the standard
native upgrade completed both synthetic Workspaces, after which tests passed.
No upgrade cursor or compatibility rule was bypassed.

The actual LOCAL executor called the built `clover-sync-authorize` function
without an initiating user. That function used the real SDK and authenticated
native GraphQL connection retrieval. It succeeded with the active explicit
grant; absent grant, revocation, stale revision after regrant and disconnect
all returned errors. No external provider request is made by this authorizer.
No raw token appeared in its returned result. Public and consumer-App attempts
to create the grant were rejected. Existing native source-object/permission
and disconnect checks remain in the same five-case integration suite.

Focused local checks: 35 App cases, 6 SDK connection cases, 6 frontend cases,
52 server unit cases and 4 real PostgreSQL transaction cases. The PostgreSQL multi-merchant case now
also proves that revoking A leaves B's grant and encrypted credential intact.
Full App/server/frontend typechecks and relevant builds/lint passed at the
source checkpoint.

## Product boundary

Settings has per-merchant Allow scheduled reads / Stop scheduled access controls.
These show grant state, not a claim that an import or scheduler is running.
`clover-sync-authorize` has no HTTP, MCP, workflow or cron trigger. Durable imports,
per-dataset receipts/progress, scheduled dispatch, full catalog adapters and
consumer financial evidence remain subsequent source phases. Twenty continues
to own identity, custody, permission, data and execution; no extra worker or vault.
