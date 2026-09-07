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

- App unit suite: 54 tests, including interrupted page/replay, changed revisions,
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
next offset is available only after a confirmed receipt; restart dispatch, atomic page/cursor transaction proof, incremental recovery and
full catalog adapters remain subsequent work. Full pages at the offset cap need
range subdivision or an explicit partial result. No complete-history claim is
made. The initial per-row implementation was replaced by the bounded batch follow-up below.

At the preceding pushed grant head GitHub showed only Danger and skipped preview
jobs. PR32 had merge conflicts against main; those checks were not broad source CI.

## Bounded batch and receipt-gated continuation

Follow-up source uses native same-object batch creation for payment revisions,
with exact reread verification of the entire page. It replaces the per-row loop
and bounds each native request to four seconds. The separate receipt write still
follows the verified data batch. A unique-conflict batch rollback is exercised
against the disposable native database; this does not prove a transaction spanning
both object types.

The private `clover-payment-import` logic function accepts a bounded range and
pins the native connection/grant. Every nonzero offset requires the previous
native receipt's exact connection, grant, dataset, range, previous/next offset
and row count before any provider read. After persistence it rechecks the grant
and uses native `enqueueJobs` with three retries. Failed/ambiguous dispatch fails
the job for replay; duplicate delivery can reprocess a page and deduplicates source
records. The receipt and enqueue are not one atomic operation; exhausted retries
still require recovery dispatch. No scheduler/root-run planner is enabled.

Full pages beyond the supported offset cap return `needsRangeSubdivision` rather
than an invalid next job or a complete-history claim. An empty page returns
`rangeRead` with coverage still unverified. The job helper's ordering and negative
cases are tested with synthetic provider responses and injected persistence/queue
boundaries. Actual provider execution and queue-worker continuation remain unproven.

Validation of the batch follow-up: 54 App tests, App typecheck/lint/build, and six
actual native integration cases passed. The payment case saves and replays 100
revisions, verifies one receipt and relation lookup, and checks that a duplicate-key
batch failure leaves no new revision from that batch. The opt-in native grant and
disconnect/executor negatives remain green. Test environment restored byte-for-byte.

CI admission at `7fd1908ec029945a249abae9e05f08fee9f2ce61` is corrected: PR32
is mergeable and GitHub's trajectory evaluation passed. Broad checks were still
queued/running at this receipt, not reported as successful. Local exact-head
fixture regression and source custody passed.

The newly admitted CI Twenty Apps job failed during cache setup because Clover
has no standalone `yarn.lock`. Its native manual-token/grant SDK contract must
come from this repository, not the published SDK. The existing App workflow now
uses the root lockfile and builds the repository SDK/client before Clover lint,
typecheck, tests and manifest build. Other App jobs retain their existing path.
The prior head's clean-foundation build and trajectory evaluation passed; this
CI admission correction still requires its own remote result.
