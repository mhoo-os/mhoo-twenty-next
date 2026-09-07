# Clover durable payment revision source proof

Scope: MHO266 App source, using MHO265 native custody/grants from
`e00a3e086901bd8fecbb724f91add2435e69740a`. Synthetic only; no provider requests,
real tokens, scheduling, provisioning or production activation.

The App owns `cloverPaymentRevision` and `cloverImportReceipt`, both native
APPLICATION-writable objects related to a native `cloverConnection`. Unique
revision/page keys scope identity to the connection lineage. Each payment
revision retains allowlisted provider IDs, raw integer minor amount, provider
creation/modification timestamps and an observed timestamp. Changed facts create
another revision. `currencyCode` is empty (native TEXT representation of unknown),
not an inferred currency. Unknown `voided` remains null. Coverage remains unverified.

The persistence helper verifies native parent identity, exact revision facts and
all saved records before saving a page receipt containing its range, grant ID,
revision keys and next offset. It checks authorization before data writes and
again before the receipt. A failed or ambiguous write returns no successful
acknowledgement. Replaying partial writes or losing a receipt response is safe:
the helper rereads and compares the stored identity instead of trusting a POST
response. Revocation during record writes can leave saved source revisions but
no new receipt. It cannot undo a request already in flight.

## Evidence

- App unit suite: 41 tests, including interrupted page/replay, changed revisions,
  separate connection lineages, lost response, authorization loss and conflicting
  persisted facts. App typecheck and lint passed.
- App build passed with the actual manifest and current stable identifiers.
- Native integration uses a dedicated disposable database at loopback port 55441,
  actual App metadata synchronization, native REST and synthetic App identities.
  It exercises receipt/revision replay, both relation directions and consumer
  write denial alongside prior custody, grant and disconnect tests.
- Native validation caught and corrected reserved `currency` field naming and
  native empty TEXT normalization; mocks alone did not establish compatibility.

## Remaining boundaries

This is replay-safe persistence, not an all-or-nothing transaction spanning
source rows and the receipt. No mutable cursor/watermark is advanced. The returned
next offset is available only after a confirmed receipt; durable job chaining,
restart dispatch, atomic page/cursor transaction proof, incremental recovery and
full catalog adapters remain subsequent work. Full pages at the offset cap need
range subdivision or an explicit partial result. No complete-history claim is
made. Per-row calls are not yet suitable for the scheduled full-page executor.

At the preceding pushed grant head GitHub showed only Danger and skipped preview
jobs. PR32 had merge conflicts against main; those checks were not broad source CI.
