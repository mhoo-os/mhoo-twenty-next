# Clover multiple-merchant source proof

2026-09-07. Approved phased source work; no production installation or intake.
Architecture: mhoo ADR-0014 source approval amendment and full read-only catalog.

## Changes

Native intake duplicate detection is scoped to merchant within the authorized
Workspace and installed App/provider, retaining the existing Workspace row lock
and encrypted atomic save. Status returns all receipts; its compatibility
singular receipt is null when ambiguous. Legacy credentials prevent duplicate
merchant onboarding without being imported/rebound. Settings shows every saved
merchant and permits another intake; lost-response recovery matches the pending
merchant rather than accepting any pre-existing receipt.

Clover readers accept an explicit native-visible connection, re-resolve it and
reject changed identity. Default selection works only for exactly one visible
connection. Payment projection now includes connection lineage in its revision
hash; no currency or durable payment import claim follows.

Native Clover connection and sync-state objects have stable identifiers, unique
keys, bidirectional relations, App-only writability and no delete permission.
Merchant observations relate to the connection. The observation writer creates
or verifies the native connection record before saving; wrong identity and
unconfirmed creation fail closed. Parent creation and observation creation are
separate API operations: an orphan parent can remain after failure, but no
successful observation receipt is returned. This is not an atomic import or
revocation-at-commit proof. The account UUID is an opaque reference to native
system custody, not a secret or a second authorization system.

## Local checks

- 27 Clover App unit tests, App typecheck/build and lint passed.
- 39 focused server cases passed: 35 intake/consumer unit cases and 4 real
  disposable PostgreSQL transaction cases. The latter prove concurrent retry,
  rollback, native credential constraints, two-merchant coexistence, duplicate
  rejection, all-receipt status and preservation of the other account after
  selected deletion. Entity fixture boundaries remain documented in that suite.
- 5 frontend form cases and full frontend typecheck passed.
- Full server typecheck and build passed; pinned source custody passed.
- 5 actual native integration cases passed against dedicated local PostgreSQL
  and Redis: built development-App sync/function upload, missing consumer
  dependency rejection, source-record read/write denial, connection/sync-state
  persistence, unique-key rejection, forward filter/reverse relation, direct
  user writability denial, native synthetic intake and disconnect/executor denial.
  Only external provider HTTP is stubbed for intake. This is not catalog install,
  upgrade, successful provider execution inside the child executor or production.
- Original .env.test restored byte-for-byte; disposable containers/volumes
  removed. Existing preview containers left untouched.

## Remaining phases

Sync-state records do not grant background rights. Native manual-token reads
still require an interactive native user. Explicit Workspace background grants,
revocation/queued execution, durable per-dataset import receipts/cursors,
complete typed provider entities, tools and final consumer evidence contracts
remain to be implemented and proved. No public/cron/workflow/MCP trigger was
added. No real credentials, provider grants, customer provisioning or live
activation. Finance source and release remain independent.
