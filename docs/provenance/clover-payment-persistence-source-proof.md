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


## Bounded shared status UI trial (2026-09-07)

User/voice dispatch through repo head `01a07aa7-944a-70c3-bf77-d51b9fc766f2`
authorized one reversible source/synthetic trial. Primary MHO-266, prerequisite
MHO-265; retained worker `01a073d5-22c3-7123-89ad-ebf486cdc93a`. Source base
`7fb5501bdc108df9ace0c619f7cafe258dde9fcc`; isolated branch
`codex/clover-two-host-trial`. The retained `codex/hass-native-onboarding`
checkout and its uncommitted operator/status/identifier work remain untouched.
This slice reuses its status UX but excludes its unresolved general executor
call. No Finance, custody, queue, provider or host primitive changes.

Existing queue/grant and planner receipts above were consulted and reused;
their code has not changed. New proof is needed only for shared React selection,
display contract decoding, two synthetic adapters and manifest non-discovery.
Initial targeted typecheck caught use of `.component` instead of the SDK
validation result's `.config.component`; corrected. Initial harness-script lint
caught console output; replaced with stdout. These failures are preserved here;
no unrelated native tests or heavy builds were restarted. Exact timestamps of
those initial checks were not captured.

The first browser run completed at `2026-09-07T09:11:58.970Z`: ten grouped
checks across both adapters, desktop/mobile screenshots and shared module hashes.
Both adapters import the same PaymentStatus component and domain contract.
The Twenty side uses the actual SDK `defineSettingsFrontComponent` validation
but renders its component with ordinary React DOM. It is a **synthetic native-
definition harness**, not Remote DOM, an installed App or native invocation.
The injected read-only fixtures do not fetch, store, authenticate or dispatch.
Denied/missing states here prove display behavior, not server authorization.

A later source inspection found that native manifest discovery scans the entire
App folder. The harness definition was changed to a named export so it cannot
be discovered as an installable settings component. Next focused validation is
justified by this changed adapter plus a new test of the actual native discovery
function; browser recheck confirms the changed entry still renders.

Residual native proof: actual Remote DOM CSS/select/useEffect behavior and
authenticated installed invocation remain unproved. The general native
executeOneLogicFunction path requires WORKFLOWS; this trial neither uses that
path nor broadens permission. Real user/App/grant intersection, foreign/stale
receipt denial before dispatch, durable recurring progress and full catalog
coverage still need their separately scoped native proof. No web backend or
secret store is created, and no deployment/installation/publication is implied.

Final focused trial result: **PASS** at `2026-09-07T09:14:32.275Z`.
Five focused tests passed, including native discovery exclusion; App typecheck
and focused lint passed. The browser recheck passed ten grouped assertions,
with no page errors or external requests. Both shared module hashes are recorded
in the artifact receipt; runtime identity assertion also compares the imported
React function. An initial retry command was issued from the wrong directory
and did not execute; the subsequent App-directory invocation passed.

Safe reproduction references: App-root Vitest target
`src/operator/status-contract.test.ts`, `tsgo --noEmit -p tsconfig.json`, and
`oxlint -c .oxlintrc.json src/operator harness`; root browser command
`node packages/twenty-apps/internal/mhoo-clover/harness/verify.mjs <output-dir>`.
Final script SHA-256:
`d2263cfacf07277154ce7a990f6b7954e79b6ee95b327def8f82a8abe7ce5f1f`.
Protected local artifact directory:
`/Users/mhoooo/.codex/visualizations/2026/09/05/01a073d5-22c3-7123-89ad-ebf486cdc93a/clover-two-host-trial-final/`.
Contains `receipt.json`, `metafile.json`, and both hosts' partial, uncertain and
mobile PNGs. Initial-run artifacts remain in sibling `clover-two-host-trial/`.
Desktop/mobile screenshots were visually inspected; no horizontal mobile
clipping was observed. Owned loopback servers closed in script cleanup and no
listeners remained on 4332/4333. No Docker resources were used.

Next owner is coordinating head `01a07aa7-944a-70c3-bf77-d51b9fc766f2` for
review of this local source increment. No publication authority is assumed.
Native installed invocation/sandbox evidence remains with the retained Clover
worker after separate scoped dispatch. Separate repository ownership remains
proposed. Source or adapter changes invalidate affected local proof; none of
this establishes deployed behavior. The final commit and source-gate results
are supplied in the handoff; existing queue evidence was not rerun.


## Actual Remote DOM compatibility follow-up

New scoped dispatch permits one local native renderer case; do not rerun the
accepted ordinary-DOM/domain/queue proof. Base is local
`8adde912c490e96947e9286f86e1c03bc6c97696`, isolated branch
`codex/clover-remote-dom-trial` in the existing trial worktree. The accepted
commit remains reachable; original 7fb dirty checkout remains separate.
Changed input: a native worker module wrapper and actual FrontComponentRenderer
host fixture. Shared PaymentStatus/domain/CSS and fixture responses stay unchanged.

Source inspection found the frontend provider test mocks the renderer and is
insufficient. Reuse native Storybook's SDK build-plugin path and actual
FrontComponentRenderer -> sandbox iframe (allow-scripts) -> worker ->
RemoteReceiver/RemoteRootRenderer. The existing sandbox-document generator is
a narrow build of its bootstrap/worker, not a whole-repository build. Its
generated file is temporary/ignored in this isolated checkout; no host source
changes or installed Workspace, token, backend or job dispatch are involved.
The new case must prove actual worker rendering, native select event propagation,
CSS injection and effect updates; ordinary DOM wrapping is not a substitute.

Actual local renderer case **PASS**, `2026-09-07T09:40:32.511Z`. One sandbox
iframe with exactly `allow-scripts` and an actual worker were observed. Native
select events drove the shared React effect, four saved-page states rendered,
CSS text color and panel radius matched, and a slow prior response did not
replace a later denied selection. Refresh worked. No external request or page
error was observed. This narrows the rendering gap for this exact component;
it does not prove native authorization, installed settings integration, every
DOM API, all browser sizes or production operation.

Earlier attempts are preserved: the SDK strip-comments plugin resolved relative
metafile paths against process cwd and failed before rendering; using App cwd
fixed that fixture mismatch. The first native attempt created a worker but timed
out (`2026-09-07T09:38:23.509Z`); diagnostic capture at
`2026-09-07T09:39:40.672Z` showed the local server returned 404 because native
fetch appends `cacheBust=v2`. Matching the pathname fixed the fixture; no renderer
or shared component change was needed. Build warnings about existing locale
modules marked side-effect-free are retained as dependency-build limitations,
not hidden or treated as translation proof.

Artifacts under the same protected visualization parent as the prior receipt:
`clover-remote-dom-trial/failure.json`,
`clover-remote-dom-diagnostic/failure.json` and `failure.png`, and
`clover-remote-dom-final/receipt.json`, `native-remote-partial.png`,
`native-remote-denied.png`, component metafile and actual bundled JS. The desktop
result was visually inspected. Shared component/domain/CSS hashes match the
accepted trial; no previous domain, queue or ordinary-DOM tests were rerun.

Final fixture uses a JavaScript host wrapper instead of the executed TypeScript
wrapper, avoiding importing host-package alias/type configuration into the App.
A targeted bundle comparison passed: generated code is identical after source
filename normalization; `host-equivalence.txt` records this, so browser proof
was reused. App typecheck, focused three-file lint and runner syntax check pass.
Final runner SHA-256:
`0aadc6d920ae1ed732c9a42b47bc4a7e9b267522b31f8f21401ccd70913293a9`.
The worker wrapper/component are unchanged; the host JSX fixture is checked by
bundling/browser execution, not claimed as App TypeScript coverage.

Next owner: coordinating head `01a07aa7-944a-70c3-bf77-d51b9fc766f2` reviews
this local increment. Remaining proof belongs to this retained Clover worker:
native authenticated operator route, installed user/App/grant enforcement and
settings integration. No request for broader WORKFLOWS permission is made.
No publication, merge, install, credentials, external provider or data effects.
Owned server/browser closed; temporary generated sandbox document and dependency
link are removed after checks. Source-gate results and exact final commit go in
the existing artifact receipt/handoff. Renderer/build/dependency changes
invalidate affected local compatibility evidence; this is never deployment proof.
