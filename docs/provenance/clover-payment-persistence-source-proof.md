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

## Isolated status read adapter hardening

Dispatch checkpoint `2026-09-07 11:40:48 UTC`: MHO-266/MHO-265 retained owner,
coordinating head `01a07aa7-944a-70c3-bf77-d51b9fc766f2`. New isolated
`codex/clover-status-adapter`, base `9b26a064b4e63e9591e11f1197ec495ddf3bf455`.
Only extracted server-side status adapter, focused tests and this ledger change.
No unfinished handler, UI invocation, HTTP trigger or manifest wiring is adopted.

Selective reuse source is the uncommitted status handler in the retained
`mhoo-twenty-next-hass` checkout at `7fb5501bdc108df9ace0c619f7cafe258dde9fcc`,
path `packages/twenty-apps/internal/mhoo-clover/src/logic-functions/clover-operator-status.logic-function.ts`,
SHA-256 `c0452293e1a56821283815569c223f3a64afaa8434eab99c36e7ecfc8484e14b`.
Reuse is its user-list -> App lookup -> filtered receipt-read intent, rewritten
as an injected server adapter with the accepted display StatusResult contract.
The unfinished definition and its IDs are not copied or activated.
Other dirty-file preservation hashes before work:
- front-components/clover-operator.settings-front-component.tsx:
  `8c9be749f0b6ac13662fb40ffb5de5f45097050184cb31873f64ed97db80ccca`
- contracts/model-identifiers.ts:
  `2a5d5a37419b91ddc4df0d8d7d85079c0cdf103a2605312ccaa6624f0680bdcb`
- tsconfig.json: `9475253ce27518417cebfef6cb40e1b31da0866967fa34dd4df1b18cdeb8e793`.
These paths are relative to the retained Clover App; final hashes must match.

Native error inspection: SDK connections get/list call
`sdk/logic-function/utils/post-graphql-request.util.ts`, which throws plain
Error for HTTP/GraphQL failures. It does not preserve a reliable denial/missing
code. No message parsing or invented "grant off" result is permitted. A failed
lookup, null grant or malformed response is uncertain. A selected ID absent
from a successful bounded authorized list is missing (unavailable to this user,
not a provider-existence claim). Validated scope/identity ineligibility denies.
The current native REST order parser reads `order_by`, not `orderBy`.

New focused tests are necessary for this changed adapter's query, receipt
validation, uncertainty and sanitized output. Prior history/grant/queue and both
UI trials remain unchanged and are reused without reruns. Integration into the
unfinished native status handler and actual invocation are explicitly unproved.

Final focused result recorded `2026-09-07 11:45:10 UTC`: nine adapter tests,
App typecheck and affected-file lint **PASS**. Initial test-file creation used
the wrong working-directory prefix, so that invocation found no tests; no test
pass was claimed. After correcting the path, eight tests passed. Review then
added explicit malformed connection-metadata rejection (uncertain, not denied);
the changed adapter/new ninth case justified the final targeted rerun. No other
suites/builds, browser, database, provider or network adapter calls were run.
All dependencies in these tests are injected synthetic functions.

Evidence covers exact native `order_by` query and limit/depth/connection filter;
invalid selectors; missing selection after a successful list; failed/null grant
lookup uncertainty; malformed/duplicate/overbound connection and receipt inputs;
foreign dataset/connection; bounded ranges/timestamps/page offsets; stale grant,
terminal and subdivision states; and omission of synthetic credential/error and
non-allowlisted fields. No native handler integration or authorization proof is
claimed. The adapter reads only an explicitly supplied user-list/App-read/REST
boundary; future wiring must retain interactive native context and native role
checks. A full list beyond 50 yields uncertain rather than false missing.

Exact source SHA-256:
`8b15a8e410b4df4ae8fe1253e02eaaa90cc8c87f8fe73d84f48b80b9c8dcaa82`.
Focused test SHA-256:
`198027510d2af10cca5fe3934092bf6259377a38fb133d9098ef61bfce34531f`.
Safe command references from App root: Vitest with `vitest.unit.config.ts` and
only `src/__tests__/operator-status-adapter.test.ts`; `tsgo --noEmit -p tsconfig.json`;
oxlint on that test and `src/logic-functions/read-clover-operator-status.ts`.
All four retained dirty-file hashes were rechecked and match the above inventory.

Final source gates/commit are recorded in the protected artifact receipt at
`/Users/mhoooo/.codex/visualizations/2026/09/05/01a073d5-22c3-7123-89ad-ebf486cdc93a/clover-status-adapter/receipt.json`
and the receiving-head handoff. No temporary service was started; the owned
local dependency symlink is removed after checks. Next owner is coordinating
head `01a07aa7-944a-70c3-bf77-d51b9fc766f2` for review. Retained executor stays
this Clover worker. HTTP event adaptation, handler/UI invocation, installed
settings and native permission/grant acceptance remain separately unproved.
No publication or broader authority is implied. Changed adapter inputs/native
SDK contracts invalidate affected local evidence; none is a runtime claim.

## Authenticated status source wiring

Source-only follow-up on `32929b86c2210e9dc4b8c26859a5eefb16817425`, isolated
`codex/clover-status-route`. Reuse existing native route, runtime and status
adapter; only merchant-list/status reads, no history or grant mutation. Preserve
original dirty7fb and accepted local commits. Status/settings IDs are selectively
reused from the previously hashed dirty identifier file; handler is newly wired,
not a copy of its unsafe generic executor path.

Native source inspection: jwt.auth.strategy validates delegated App tokens and
resolves user/Workspace membership; authenticated route-trigger verifies the
Workspace and forwards user identifiers to the executor. The executor resolves
workspaceMemberId and generates separate delegated-user/App tokens. Handler uses
only that verified execution context, never event.userWorkspaceId, headers,
rawBody or body identity claims. Native buildLogicFunctionEvent wraps JSON as
body. Although forwardedRequestHeaders is empty, isolated-origin routes use
forwardAllHeaders; no claim is made that the platform never forwards headers.
The new handler ignores and never returns those fields.

New focused tests are justified by route/event/body/context and client wiring:
actual native event builder/response mapper plus injected SDK/fetch transport.
No service or metadata writes. Existing adapter/history/grant/queue/UI tests are
reused, not rerun. Settings uses shared PaymentStatus and native RestApiClient
runAs:user at /s/clover/operator-status. No executeOne, WORKFLOWS expansion,
cron, tool exposure or provider read. Actual installed route/permissions remain
unproved; local mocks do not grant acceptance.

Focused source result: six route/client tests passed, affected lint and App
TypeScript passed. Native App `dev:build` passed (19 files), including typecheck.
Built manifest inspection confirms one authenticated POST status route, one
settings component using the retained stable UID, and existing role ceilings:
only CONNECTED_ACCOUNTS flag, no all-tools/all-settings expansion. No other
logic functions acquire HTTP/tool/cron exposure. Tests use native event/response
builders but mocked SDK/fetch; they do not prove deployed authentication.

During packaging inspection an assertion incorrectly expected usesSdkClient=true.
The actual SDK build-result processor marks external generated SDK imports only;
front-component external modules include core/metadata, not rest. RestApiClient
is bundled, so false is correct. Direct delegated client construction now lives
in the settings entrypoint and is injected into the helpers; its changed wiring
was followed by the same six focused tests and build. Corrected manifest
assertion passed. Native worker environment injection is independent of that
external-module flag. No native host changes were made. Existing deprecated
application default-role declaration warning remains; it is not a new failure.

UX limitation: after initial merchant-list success, Refresh status reloads the
selected status rather than the connection list. Reopening settings reloads the
list; post-revocation selection still rechecks the server adapter's current
user/App/grant path. Do not claim dynamic connection-list refresh or installed
revocation proof. Broad isolated-origin header forwarding remains a platform
behavior; tests deliberately include raw headers and spoofed event identity,
while the handler reads only body selectors and verified execution context.

Reproduction references from App root: Vitest `vitest.unit.config.ts` target
`src/__tests__/status-route.test.ts`, affected-file oxlint, native SDK CLI
`dev:build`. Initial focused completion was observed at 2026-09-07 12:43:44 UTC;
final detailed source/build/artifact timestamp and hashes are in
`/Users/mhoooo/.codex/visualizations/2026/09/05/01a073d5-22c3-7123-89ad-ebf486cdc93a/clover-status-route/receipt.json`.
No unchanged history/grant/queue/renderer tests were rerun. Original dirty7fb
files remain separate and are hash-checked at closeout. No service started;
only the owned dependency link is removed. Ignored local App build output is
retained as evidence, not installed or published.

Next owner: coordinating head `01a07aa7-944a-70c3-bf77-d51b9fc766f2` reviews
exact local source and updates its existing Linear checkpoint. Retained Clover
worker owns subsequent explicitly scoped work. Actual installed settings/route
and native user/App/grant enforcement remain unproved; no publication, install,
merge or provider access authority is inferred from this source increment.
