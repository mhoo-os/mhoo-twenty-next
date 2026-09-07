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

## Proposed disposable native status acceptance — not dispatched

Receiving head accepted source `de136bfffa624aa2d591739d8cdd120191c322b1`.
This proposal adds no execution authority. Candidate App output is the existing
19-file build at that source; verify manifest/bundle hashes against its protected
receipt before reuse. No new product framework, worker or runtime is proposed.

### Exact resources and prerequisites

- Existing owned PostgreSQL container `mhoo-clover-native-proof-db`, loopback
  `127.0.0.1:55441`, database `clover_native_synthetic`; Redis
  `mhoo-clover-native-proof-redis`, `127.0.0.1:56391`, database 0. These are
  historical ownership references, not a fresh claim that they exist or run.
- Existing native test server at `http://localhost:4000`, local synthetic file
  storage `/tmp/mhoo-clover-native-proof-storage`. No port reuse if another
  owner is listening. Do not touch preview databases/Redis or production.
- Reuse standard integration bootstrap and seeded Apple Workspace/secondary
  Workspace from the existing suite. First check schema/seed/candidate identity
  and no foreign fixture ownership. No database reset, fresh migrations or seed
  rebuild is included; missing/incompatible state returns a concrete scope gap.
- Reuse `.env.test` override wrapper with byte-for-byte restore in finally;
  logging-only email, billing/telemetry disabled as in the prior owned proof.
  No credentials or env values in evidence. No new dependency installation.
- For actual settings navigation, reuse a locally built Twenty frontend only
  after identifying its source/artifact receipt. If unavailable, report that
  exact missing artifact/build scope; do not silently launch a whole-repo build
  or call a standalone renderer an installed settings-navigation proof.

### Fixture identities and install delta

Use only existing seeded test JWT identities from the integration fixture store:
Apple Workspace administrator for setup, a synthetic restricted Workspace member,
a different seeded Workspace member, and the installed Clover App with delegated
user and App-only tokens minted through native test helpers. Never print tokens,
copy a saved browser session or use a real Workspace. Scoped setup must create
or modify only test-owned role/member fixtures needed for permission denial,
then restore those exact fixtures. The original standard role must stay intact.

Reuse `setupApplicationForSync`, `uploadApplicationFile`, `syncApplication` and
`generateApplicationToken` from the existing application integration utilities.
Synchronize the exact candidate Clover manifest once in the disposable Workspace;
this includes existing objects/provider/role/private functions plus the new status
HTTP route/settings component. Upload Source/BuiltLogicFunction files as before,
and add Source/BuiltFrontComponent upload for the single settings component.
Do not install Finance or broaden the Clover role. No cron or importer dispatch.

Create two synthetic merchant connections through the existing native intake
fixture/controller; the SecureHttpClient provider lookup is stubbed with fixed
merchant responses and external egress denied before any fixture intake. Values
are synthetic credentials only. Enable the existing native grant for A; keep B
without it. Persist a small test-owned connection/receipt fixture under native
App identity: one current-grant receipt and one historical-grant receipt. Test
revoke/regrant only for A if explicitly included in acceptance authorization.
Those are real writes to the disposable database, not read-only setup; no
production/customer/grant mutation is included.

### One focused acceptance case and reused proof

Extend/select a status-only native case using existing
`test/integration/metadata/suites/application/clover-native-data.integration-spec.ts`
utilities and `jest-clover-proof.config.ts` bootstrap. Do not run its six existing
cases wholesale or its queue-abandonment importer scenario. A narrowly selected
case/profile must retain the dedicated DB/Redis/server assertions. Reuse prior
queue, encryption, persistence and renderer receipts where inputs still match.

1. With native delegated identity, POST `/s/clover/operator-status` list/status
   returns only permitted selectors and bounded receipt display facts. Verify
   actual routing/environment token propagation, `no-store`, native sort order,
   settings manifest lookup and built component retrieval. Inspect route cutoff/
   isolated-origin configuration first; do not disable its protection to pass.
2. Without authentication, with App-only identity, restricted/removed membership,
   or a foreign Workspace/connection selector, no protected records or secret
   fields are returned. Do not require a fabricated denial label when the SDK
   only supplies opaque errors: uncertain is acceptable if no data/read escapes.
3. Off/revoked grant refuses receipt access; current grant allows A only. A stale
   receipt remains stale after regrant; B never inherits A's access or history.
   Use the smallest synthetic records and native grants; no provider/history job.
4. Spoofed body/event/header identity cannot replace verified context. Unknown
   payload fields fail closed. Opaque lookup/read failure contains no raw header,
   body, credential or internal error. Existing source negatives need only the
   new actual invocation boundary, not duplicate broad unit suites.
5. In an isolated browser context, open actual native settings using the verified
   local frontend and native synthetic sign-in. Select A, inspect saved status,
   refresh and exercise a denied case. Capture sanitized screenshots/network
   observations; no token in screenshots/storage dumps. If frontend provenance
   is missing, keep settings navigation unproved even if HTTP checks pass.

Outbound provider requests must be denied, not merely counted afterward. Use
existing SecureHttpClient stubs for fixture intake and a test-only LOCAL bundle
transport guard allowing the exact loopback native origin; no request to Clover
is needed for status reads. Preserve original bundle plus fixture hash and
transformation receipt. No production bundle test switch, new proxy or provider
API call. Do not use the existing payment importer transport/retry scenario.

### Cleanup, refusal and estimate

Track every created App/file/connection/grant/receipt/role fixture by native ID.
Remove only test-owned data via native cleanup and restore changed synthetic role
fixtures in finally; verify residual IDs/owned files and restore `.env.test`.
The existing cleanup helper deletes by App universal identifier across its DB:
use it only after proving all matching rows belong to this run; otherwise refuse
that cleanup and report scoped IDs to the owner. Never reset a shared database.
Close the owned browser/native test server, stop only containers started by this
run and restore previously running owned resources to their initial state.
Record failures and cleanup even if acceptance fails; no process-wide kill.

Estimated active effort: 1–2 hours to adapt/select the fixture and gather bounded
native HTTP/settings evidence if existing seed/frontend artifacts are usable;
a test execution should take minutes. Unknown seed/artifact compatibility may
require a separately scoped repair/build and is not hidden in that estimate.

Requested scope for receiving-head/user resolution: start the two exact owned
containers and test server; synchronize exact candidate metadata/built settings;
write and remove only the synthetic identities/connections/grants/receipts above;
run one native status acceptance case plus isolated browser; enforce no provider
egress and perform scoped cleanup. No execution, install or new test was run in
preparing this proposal. Next owner is repo head
`01a07aa7-944a-70c3-bf77-d51b9fc766f2` to resolve that exact authority before
this retained Clover worker proceeds. Source remains unpublished.

### Native acceptance execution preflight 2026-09-07T13:00:57.942507+00:00

Approved candidate `de136bfffa624aa2d591739d8cdd120191c322b1`, proposal `75420b962569004ba68d4d88504b476400d7cc1a`. Docker Desktop started with explicit head authorization. Only owned proof PostgreSQL (55441) and Redis (56391) started; auto-started unrelated preview containers untouched. Read-only inventory: Apple and YC active; zero Clover App installs. Initial inventory query requested nonexistent workspace name column and failed without writes; corrected query succeeded. No reset, seed or migration. New native status acceptance fixture is required because prior source/Remote DOM proofs do not establish installed HTTP execution. Uploaded logic adds a test-only localhost fetch fence; exact candidate files remain unchanged. Frontend build provenance unresolved, so installed browser acceptance stays pending. Protected execution log: `/tmp/clover-status-native-acceptance.log`; environment restored byte-for-byte by bounded runner. Cleanup owns only created Clover IDs and the two containers started here.

First native attempt: App sync, native intake, receipt ordering, no-store, ungranted uncertainty and App-only denial passed before guest assertion failed: actual empty merchant list versus expected absent field. Fixture expectation corrected to empty list; no candidate source changed. AfterAll passed and environment restored. Failure retained at `/tmp/clover-status-native-acceptance-attempt1.log`. Rerun justified solely by corrected guest assertion and remaining revoke/regrant cases.

### Native HTTP acceptance result 2026-09-07T13:02:53.916945+00:00

PASS: one native Jest acceptance case, 3.928 seconds. Installed candidate metadata and native HTTP executed with synthetic credentials and localhost-only uploaded logic fetch fence. Receipt ordering, no-store, guest empty list, App-only denial, unauthenticated rejection, identity-field rejection, missing selector, ungranted isolation, revoke and regrant historical receipt marking passed. AfterAll removed owned connected accounts and App; readback App count zero. Environment restored byte-for-byte; only two owned containers stopped. Fixture formatted with Prettier without behavioral change. Evidence: `/Users/mhoooo/.codex/visualizations/2026/09/05/01a073d5-22c3-7123-89ad-ebf486cdc93a/clover-status-native-acceptance/receipt.json`. Installed browser and foreign Workspace token acceptance remain unproved; no production or real credential intake enabled. Next owner: repository head to resolve frontend provenance and remaining acceptance scope; no push/merge/deploy authorized by this result.

### Remaining foreign Workspace case 2026-09-07T13:05:20.038987+00:00

Head clarified this is already approved75420 scope. Reuse passed main case; select only new `denies foreign Workspace` case. Rechecked owned containers stopped before restarting the same two. Use existing YC seeded native user membership through native AccessTokenService; create only one Apple synthetic connection, install same App metadata, assert native403/404 and no Apple selector/merchant/receipts. No seed/role mutation. Test-only transport fence means exact App source with transformed fixture bundle, **not byte-identical production execution**. Same owned cleanup and environment restoration; protected log `/tmp/clover-status-native-foreign.log`.

Foreign Workspace result 2026-09-07T13:06:41.343714+00:00: PASS (3.453s), prior main case skipped/reused. Native AccessTokenService resolved existing YC user/membership; list and actual Apple connection selector rejected403/404 without merchant/pages/selector disclosure. Owned connection/App cleanup passed, independent Appcount0, environment restored, only owned PostgreSQL/Redis stopped. Exact App source was executed through test-only transformed transport-fenced bundles, not byte-identical production execution. Evidence `/Users/mhoooo/.codex/visualizations/2026/09/05/01a073d5-22c3-7123-89ad-ebf486cdc93a/clover-status-native-acceptance/clover-status-native-foreign.log`.

Frontend provenance remains unresolved: existing build has PWA and brand asset manifests but no source commit/build receipt/sourcemaps. No new build run. Bounded candidate-compatible command, from this checkout packages/twenty-front: `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=8192 REACT_APP_SERVER_BASE_URL=http://localhost:4000 ../../node_modules/.bin/vite build --outDir /tmp/mhoo-clover-status-front-build`. Requires head authorization for local frontend build (up to8GiB heap), ignored temporary output, existing dependencies only, and loopback serving for installed settings proof. No dependency/Nx builds, installation, deployment or source mutation proposed.

Source custody closeout: initial exact-head fixture rejected the new `packages/twenty-server/jest-clover-status-acceptance.config.ts` path (spec also absent from allowlist). Rejection preserved in protected receipt. Head explicitly authorized adding exactly that config and `packages/twenty-server/test/integration/metadata/suites/application/clover-status-native.acceptance-spec.ts` to existing Clover allowlist as proof support. No broader exemption or App source change. Source custody, formatting and diff-check passed; rerun only changed exact-head gate after local commit, reusing native test results. Frontend build remains awaiting separate authorization; no build started.

### Authorized proven frontend and installed browser run 2026-09-07T13:12:27.463862+00:00

User approval relayed by head authorized isolated Vite build using existing dependencies and localhost4000, retained stable artifact custody. Vite build PASS (23.73s) at source `c5a643cbc8d6d811293b91e8a97e94cf0336310d`, tree `a2ab31691304ab7a18ed84fd106c46354b6242a8`; App candidate remains `de136bfffa624aa2d591739d8cdd120191c322b1`. Retained build, output/config/lock/dependency-state hashes and runner under protected `clover-native-settings-browser` artifact directory. Temporary src/front symlink uses existing native ServeStaticModule. Only owned DB/Redis restarted. Selected only new installed-browser case; prior native cases skipped/reused. Isolated Chromium uses seeded Jane native password flow; provider egress blocked. Run log and screenshots retained there, no credential storage dump. Cleanup removes only test IDs/services/links; build retained.

Browser attempt1 failed before sign-in: native test server returned404 for root despite temporary frontend link. Failure log/screenshot retained. Reversible harness correction serves only retained build static files/SPA documents through Playwright route fulfillment at localhost4000; native auth/metadata/status APIs remain actual server requests, with no intercepted API responses. This proves installed settings browser execution using provenance-bound frontend bytes, not production static hosting. Rerun selects browser case only; no frontend rebuild or prior native tests repeated.

Browser attempt2 reached native `app.localhost:4000/welcome` redirect but static delivery was limited to barelocalhost, yielding404. Preserved attempt2 logs/screenshots; expanded only build static delivery to native loopback subdomains, keeping auth and application APIs unintercepted. No frontend build or App source change. Attempt3 selects browser case only.

Browser attempt3 stopped before browser: native begin returned409 because prior synthetic handoff AppToken rows remained counted by ten-minute limiter. Earlier cleanup removed connected accounts/App but omitted these handoff metadata rows; prior full-cleanup wording is corrected here. Read-only exact timestamps/merchant/Workspace inventory identified ten rows attributable to runs13:01:30 through13:16:14 UTC; deleted only their explicit IDs with CloverTokenHandoff/Apple guards (DELETE10). Fixture now records each begin requestId and removes only those IDs in cleanup. Limiter and product source unchanged. Attempt3 log retained; attempt4 browser-only retry justified by owned metadata cleanup.

Browser attempt4 completed seeded native password sign-in but native Workspace verification redirected to apple.localhost:3001 (default FRONTEND_URL), which egress fence blocked. Failure preserved. Bounded environment-only correction sets FRONTEND_URL=http://localhost:4000 alongside SERVER_URL, restored with existing runner. Browser now waits for apple.localhost:4000 verification completion. No build/source change; browser-only attempt5.

Browser attempt5 reached Apple host and briefly found Settings, then returned to welcome; retained failure. Attempt6 adds a wait for authenticated Companies navigation before loading settings and sanitized GraphQL error-only observations, to distinguish hydration/navigation timing from native auth failure. No credential or response payload dumps.

Browser attempt6 diagnosed native MFA requirement for seeded Jane (`Two factor authentication verification required`); no MFA configuration/secret touched. Protected failure contains error-only observations and verification UI. Attempt7 uses already-approved seeded native JWT through frontend tokenPairState initialization only, with native server resolving all identity/membership/role data; no fabricated authority state. This is authenticated fixture bootstrap, not completed interactive password/MFA sign-in. Interactive MFA remains unproved.

Browser attempt7 tokenPair-only bootstrap returned to welcome; protected GraphQL diagnostic showed unauthenticated cookie probe. Attempt8 uses existing native UserSessionService.createSession for verified seeded Jane membership (DB identity readback), then native HttpOnly twenty-session cookie in isolated browser, instead of frontend tokenPair injection. Session ID recorded for exact cleanup. This remains approved authenticated synthetic fixture bootstrap, not password/MFA proof, and does not alter roles/memberships/MFA or server guards.

Attempts8/9 native cookie and combined cookie/token bootstrap still returned welcome. Source inspection identifies missing native verify/loadCurrentUser hydration required by PageChangeEffect; no Workspace/role state injected. Read-only existing seed metadata: workspace MFA enforcementfalse; Jane methodVERIFIED; Tim no method, Object-restricted role with settings/readAll/tools flags true. Attempt10 uses unchanged native Tim password sign-in and Tim-owned fixture connections via existing native token helper, no role/MFA changes. This retains actual native Workspace hydration. Prior failedbootstrap artifacts retained, not accepted sign-in proof.

Browser attempt10 completed Tim native password/Workspace sign-in and loaded Companies. Broad Settings text selector navigated away rather than opening App tab; attempt11 targets native `data-testid=tab-settings` from existing TabButton implementation. Prior failure preserved. No auth, App or build changes.

Installed browser attempt11 PASS through Tim native password sign-in and Workspace verification; actual Settings tab, merchant selection,12 saved records, refresh, revoke -> uncertain/no records. Screenshot review found initial positive capture above receipt area due internal scroll; attempt12 only repeats browser case to capture missing visible receipt evidence and validate exact auth-row cleanup, prior HTTP/crossWorkspace still skipped. Retained initialPASS receipt/log. Password attempts created7 session and7 refresh rows: exact readback IDs/timestamps correlated to runs, removed by explicitIDs only (DELETE7 each). Fixture now snapshots seeded Jane/Tim auth row IDs and removes only newly created IDs; no broad seed/reset/role changes.

### Installed settings acceptance complete 2026-09-07T13:36:45.997448+00:00

Final browser-only case PASS; earlier HTTP and foreign-Workspace cases skipped/reused. Actual native Tim password sign-in/Workspace verification, App Settings tab, own merchant, saved12/0 receipt rows, refresh, revoke -> uncertain and no saved rows. Positive/negative screenshots inspected and show intended states. No authority state injection, MFA change or provider calls. Static frontend is verified retained build delivered by fixture, not production static hosting; App source exactde136 with test-only transformed transport-fenced uploaded bundles. Jane MFA flow remains unproved and unchanged.

Readback cleanup: Clover App0, new seeded-user auth tokens0, new sessions0; owned connected accounts/handoffIDs removed; env restored byte-for-byte. Two owned containers stopped, temporary src/front link and owned local storage removed; build/source/evidence retained at `/Users/mhoooo/.codex/visualizations/2026/09/05/01a073d5-22c3-7123-89ad-ebf486cdc93a/clover-native-settings-browser`. Runner sources, logs, screenshots, config/lock/dependency/output hashes retained in that artifact. Invalidate runtime proof after source/config/identity/deployment change; frontend artifact retains exact build provenance. Next: local fixture/docs commit and exact-head source gate, then separately isolated PR32 generated SDK/test-discovery fixes per head dispatch; no push/merge/deploy.

### PR32 CI repair after isolated browser acceptance

Remote PR32 verified OPEN at `7fb5501bdc108df9ace0c619f7cafe258dde9fcc`; separate worktree `codex/clover-pr32-ci-repair` preserves browser proof chain `dbe20e011a01c5d9974c73e891644a16763bda84` and retained frontend build unchanged. Head supplied exact hosted failures: integration job101625282117 discovers guarded same-origin suite in generic environment; server-validation job101625281705 finds missing generated SDK manualTokenWorkspaceGrantId. Dedicated config selects only same-origin suite, generic config excludes only exact suite, guard untouched. Generator needs native /metadata introspection: owned DB/Redis and exact7fb native server only, no App install/data/providercall/build. Reuse passed runtime/browser/native proofs.

PR32 repair validation 2026-09-07T13:42:56.351240+00:00: existing generator against native7fb metadata PASS; exact diff is manualTokenWorkspaceGrantId in3generatedSDKfiles (6addedlines). Offline existing generator re-emission from captured native SDL matches all13 generated files byte-for-byte. SDK `tsgo -p packages/twenty-client-sdk/tsconfig.lib.json --noEmit` PASS. Generic Jest discovery592suites excludes exact same-origin suite; dedicatedconfig selects exactly that suite. Original dedicated DB guard source unchanged, no runtime tests rerun. Focused2config oxlint andPrettier PASS. Generated files are excluded by existing lint policy; deterministic generator consistency and SDK typecheck cover them.

Preserved preparation failures: discovery command first used root-relative wrongcwd (notestexecuted), then correctservercwd passed; offline generator initial ESM namedimport failed, corrected CJS default import passed; lint initial missing reused plugin build then cross-root invocation panic, resolved by temporary link to existing unchanged plugin artifact and in-worktree invocation (no rebuild). Owned DB/Redis stopped and env restored after schema-only run, no App/datafixture/providercalls. Temporary generator fixture/config retained in protected evidence then removed from checkout.

Integration recommendation: cherry-pick this isolated7fb repair onto accepted `dbe20e011a01c5d9974c73e891644a16763bda84` chain later under head publication authority. Preserve both appended provenance sections and the exact union of existing status acceptance paths plus new dedicated auth config if those shared lines conflict. Do not replace the acceptedApp/browserchain with this olderbase. No push/merge/deploy in this repair.
