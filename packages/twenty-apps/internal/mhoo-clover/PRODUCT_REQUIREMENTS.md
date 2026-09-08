# Clover native integration — phased source build

Owner approved finalization and phased source implementation on 2026-09-07.
Standalone Clover App; required coverage is every available authorized read-only
Clover data object, persisted provider records, background sync, and multiple
merchant connections per native Twenty Workspace.

## Authority and custody

Twenty owns identity, membership, permissions, encrypted native Connections,
records, functions, jobs, App lifecycle and MCP. Clover owns provider reads,
source observations and sync state. Finance and other Apps consume native
records with their own permissions, without receiving Clover credentials.
No additional worker, vault, identity or database.

Each merchant has a separate App-bound native account. Intake rejects duplicate
merchant custody in the Workspace under a Workspace transaction lock. Existing
legacy custody blocks duplicate onboarding but is never relabeled. A new
merchant may connect independently. Reconnection creates a new account lineage.
Readers select a visible connection explicitly when several exist and re-resolve
it before use; selectors do not grant access. Disconnecting one account must
leave the others and historical observations intact.

## First source slice

- Native connection and per-dataset sync-state objects, bidirectional relations,
  unique identity keys, App-only writability and bounded App role permissions.
- Merchant observation records linked to their native Clover connection. The
  native account UUID is an opaque system reference, not a second credential.
- Payment-page projection uses a fixed provider origin, GET only, 89-day
  windows, 100 records, bounded response/deadline and explicit native account.
  Returned revisions include connection identity, raw integer amounts, provider
  times and a content revision hash. Currency remains unresolved.
- Native settings lists multiple receipts and permits another merchant form.
  A lost submission response is reconciled to that form's merchant, not any
  existing Workspace receipt. No token retained in browser storage.

These are source capabilities, not live activation or full ingestion. Connection
status is an observation, not a permanent access guarantee. Sync-state metadata
does not imply a scheduler, granted background access or committed coverage.

## Continuing phases and acceptance

1. Prove native model installation, uniqueness, both relation directions,
   per-connection filtering, allowed/denied writes and disconnect isolation.
2. Persist typed order/payment/refund/line-item source revisions and native page
   receipts with idempotent restart. Advance progress only after committed data.
3. Native explicit per-connection Workspace grants and actual background
   executor authorization are now source-proven. Persisted grants are absent by
   default; revoke/regrant changes the revision and rejects stale queued input.
   Scheduled dispatch and provider ingestion still need their own implementation.
4. Expand inventory, merchant configuration, employees/shifts/customers/cash
   events and MSC families. Conditional ecommerce, provider App billing and
   device APIs require their own supported credential/API evidence. They are
   coverage gaps, never silently claimed complete.
5. Expose bounded native read tools and per-connection/combined views under
   native role/row permissions. Finance amount/currency/sign/lineage acceptance
   remains separate from provider ingestion.

For each dataset record scope evidence, endpoint/schema version, provider IDs
and relationships, historical intervals, incremental filters, failure state and
confirmed deletion/void/correction limitations. Missing pages/403 are not zero
activity or deletion. Offset pagination is not a stable snapshot.

The source-backed catalog is in mhoo PR51 at
`docs/reuse/CLOVER_READONLY_OBJECT_CATALOG_2026-09-07.md`; the coordinated plan
is `docs/reuse/CLOVER_PRODUCT_PLAN_PROPOSED_2026-09-07.md` (historical filename).
Provider sources: [index](https://docs.clover.com/dev/llms.txt),
[filters](https://docs.clover.com/dev/docs/applying-filters),
[payments](https://docs.clover.com/dev/docs/get-all-payments), and
[permissions](https://docs.clover.com/dev/docs/gdp-set-app-permissions).

## Release boundary

Synthetic source proof only. No real credentials, scope expansion, invitations,
provisioning, migration, provider writes, production install or activation.
Native uninstall is destructive; no source-survival guarantee or cross-App
dependency blocker is implemented. Finance production release is independent.
