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
boundaries. Actual provider execution remains unproven; the later synthetic native queue proof below covers continuation.

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

## Native queue recovery proof

The next source correction uses SDK `RetryableLogicFunctionError` for failed or
ambiguous enqueue. An ordinary Error does not request application retry from
Twenty's native `LogicFunctionTriggerJob`. Invalid input and grant denial remain
nonretryable. The App test checks this exact error class.

Six native integration cases passed with the expanded final case using native
`ApplicationJobService` enqueue, dedicated Redis/BullMQ, the booted native
request-scoped `LogicFunctionTriggerJob`, and the LOCAL executor. The disposable
uploaded payment bundle has a prepended transport fixture: provider GET responses
are synthetic, and native enqueue can fail before dispatch or lose its response
after the real enqueue. The committed App bundle has no override/test switch.
Only this disposable queue's existing workers are paused during the controlled
worker test and resumed afterward; test jobs and fixture files are cleaned up.

- A lost native enqueue response causes actual retry. Parent and duplicate child
  delivery preserve one receipt per observed page and deduplicate source revisions.
- A persistently unavailable enqueue exhausts three application retries. Native
  job completion does not imply import completion: only the first page receipt
  exists. Explicit continuation from that receipt recovers the missing next page.
- The test worker is force-closed after the native handler saves/enqueues but
  before BullMQ acknowledges the job. A replacement worker recovers the stalled
  job; replay leaves two receipts for the range and no duplicate source revisions.
- Three synthetic ranges retain exactly 300 revisions. The final check uses native
  filtered `totalCount`, respecting REST's 200-row response cap.

This proves bounded worker-abandonment/replay in the disposable runtime, not an OS
crash, infrastructure restore, production queue, automatic recovery UI, continuous
scheduler or full provider coverage. Source batch, receipt and enqueue remain
separate operations. Root history planning, recurring sync and operator-facing
recovery remain next work.

Validation: 54 App tests, App typecheck/lint/build, six native integration cases
passed (expanded suite 44.557 seconds). The test environment was restored exactly.
Remote `b377907836f1e2595a23e6cbf4ee43a2030e4fc2` Clover App CI, clean-foundation
build, shared CI and trajectory evaluation passed. Later source commits require
their own CI receipts.

## Dedicated test profile

Run the App build first, then the disposable native suite using
`NODE_ENV=test jest --config jest-clover-proof.config.ts --runInBand` from the
server package. It retains standard engine setup and selects the same six cases.
The suite hard-requires database `clover_native_synthetic` on loopback port 55441,
Redis on loopback port 56391, and server URL `http://localhost:4000`. Generic
integration discovery excludes this resource-bound suite so ordinary CI cannot
accidentally run the App-install/worker fixture against its general test database.
The dedicated proof remains a separately run local receipt, not a broad-CI claim.

Dedicated-profile validation passed all six cases in 71.286 seconds. Discovery
selects exactly the Clover suite; the generic profile retains 593 other suites.
The suite now explicitly checks the dedicated Redis URL and server URL as well
as the database before any fixture activity. Test environment restored exactly.

## Explicit history and recovery operator entry points

MHO266 adds private native `clover-payment-history` and
`clover-payment-recover` logic functions. Both require interactive Workspace
membership, a delegated user token and an explicit native App token. The helper
resolves the user's connection before App-only custody or receipt access, then
checks the current background grant and matching merchant identity.

History accepts an explicit past range and supported time field, partitions it
into contiguous windows no longer than 89 days (at most 200), and enqueues only
connection/grant selectors and bounded ranges. Recovery reads the native receipt,
checks connection/grant/dataset/range/offset/revision keys, rechecks both current
authorities, and queues exactly its next offset. Short pages retain unverified
coverage; the offset cap returns a subdivision requirement. Enqueue uncertainty
never produces a successful queued result. Regrant does not relabel old receipts.

Dispatch explicitly uses the native App token through the generated Metadata API
client even when a delegated user token is present. This preserves background
execution for the queued importer, while the operator helpers independently
enforce current user access before dispatch. No credentials enter job payloads.
There is no public HTTP, tool or cron trigger. Native execution/installation and
a visible operator UI for these new entry points remain separate proof gates.

Focused App tests cover range partitioning, invalid/future/oversized ranges,
user-denial ordering, stale grants, changed merchant identity, receipt binding,
terminal/subdivision states, revocation between lookup and dispatch, ambiguous
enqueue and explicit App-identity dispatch. The prior native queue proof was not
rerun because its implementation is unchanged. Recurring scheduling remains
disabled pending a proved durable progress and recovery contract.

Planner/recovery validation: 74 App tests passed, followed by the four-case
manifest target including two new operator-entry negative cases (76 covered
cases in total). App typecheck, lint and the 15-file App build passed. This is
source/local proof; the new operator functions have not been installed or invoked
in a live Workspace.
