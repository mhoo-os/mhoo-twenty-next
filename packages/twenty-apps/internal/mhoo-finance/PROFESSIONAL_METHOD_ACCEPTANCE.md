# Professional investigation method acceptance map

## Temporary API-key fallback inspection — 2026-09-14

Coordinator relayed explicit user approval to obtain a narrowly scoped temporary
Workspace API key for Hass Finance installation/testing, preferably existing,
with minimum scope/expiry and revocation after use. No App role expansion or
Oracle/server work was authorized to this lead. Oracle maintenance belongs only
to `01a09b1a-36a5-7390-9821-1451d907d312`; this lead has performed or delegated
no host operations and requested a safe timing acknowledgment before mutations.

Fresh native UI at Hass Kitchen Settings → MCP & APIs → API lists no existing
keys. The new-key form exposes only `Admin` and `WhatsApp function role` as
assignable roles; expiration options start at `15 days` and default to `Never`.
The form was inspected and cancelled unsaved. No key, grant, role, token export,
plan/apply or customer/provider operation occurred.

The coordinator received the concrete mismatch: there is no available narrow
Finance installer key. A temporary Admin-scoped key with immediate revocation
and a 15-day expiry cap needs explicit scope approval; an Applications-only
installer role would instead require separately authorized role creation and
verification that it supports the exact CLI operations. Neither choice was
silently selected. Oracle's maintenance completion is a separate timing gate.
Candidate App Task/People/Note permission and rollback prerequisites remain
unchanged. This note supersedes the earlier blanket no-new-key authority only
for the approved narrow temporary fallback; no credential has yet been created.

## Installed-target discovery — 2026-09-14 05:18 Bangkok

Installation remains **NOT APPLIED**; real Follow-ups functional acceptance is
**NOT PROVEN**. Sole retained runtime lead is
`01a09cd2-9ab9-76a3-97d4-37d2300a65a8`, same `finance-native-review-ui` and
MHO-7/MHO-135/MHO-146. Both handoff acknowledgments were received; Delivery Room
ownership transferred with revision 14 → 15, preserving previous source leads.
Accepted implementation remains `f87cfc5296bcb036f79eaac6581b77cab9d6d0c1`;
`7fb2950bc6f24d719a68375f7b861b41da225d5c` adds handoff documentation only.
No unchanged test/build suites were repeated. Source custody was checked once
against the accepted implementation and passed.

Fresh observations (not inferred from prior installation receipts):

- Existing browser session at `https://hass-kitchen.mhoo.app` displays Hass
  Kitchen and native profile Tanyawit Nilnavarat. Members lists two existing
  accounts; no second session or allowed/denied role execution was established.
  Guide owner supplied retained Workspace key `ws_be7c8bf326d474ab745cfbd1`;
  that key is not independently verified as the native Twenty UUID.
- Native Installed Apps shows Mhoo Finance, Local, version 0.1.0, application
  ID `31a2ddce-fc04-4278-b3a9-1b2080dc830f`, six objects, two fields, one logic
  function and one front component. Its Permissions panel displays no
  object-level permissions and disabled/off global settings/actions. This is a
  UI observation of the older installation, not a tested effective-role receipt
  or proof of its exact source/build checksum.
- Existing CLI `production` pointed at `https://hass.mhoo.app`, which failed
  both browser and OS DNS. Coordinator supplied the working current host.
  Using exported SDK ConfigService, only that remote's apiUrl was corrected to
  `https://hass-kitchen.mhoo.app`; the default remote and credentials were
  retained. Previous URL is recorded here for configuration rollback. No
  browser sessions or tokens were extracted or copied.
- Pinned CLI `twenty -r production remote:status` on the corrected target
  reports OAuth invalid. `twenty -r production plan` exits 1 at server/auth
  preflight: `Authentication failed. Run yarn twenty remote:add to authenticate.`
  It never reaches manifest build or a metadata change plan.
- Supported SDK `authLoginOAuth` against the correct host returns
  `OAUTH_NOT_SUPPORTED`: server does not expose a CLI client ID. Read-only
  discovery confirms HTTP 200, issuer and authorize/token endpoints on
  `hass-kitchen.mhoo.app`, and absent `cli_client_id`. This attempt stopped
  before a browser grant or token write. No API key was created as a workaround.
- Existing local remote `http://localhost:2020` cannot connect; no disposable
  Workspace was verified or created. No dev watcher was started.

Smallest remaining decisions and prerequisites:

1. Runtime custodian must establish a compatible existing CLI authentication
   route/registration and the installed Finance rollback artifact. Neither is
   known by the guide owner. A new API key or OAuth grant needs exact authority;
   routine browser sign-in alone cannot repair the missing CLI client discovery.
2. Obtain the actual CLI metadata plan before apply. Accepted candidate's
   default App role denies native Task writes and lacks People/Note reads, so
   an existing user writer alone cannot be assumed sufficient. A proposed
   change must explicitly scope Task writes to Finance rows and required fields,
   plus bounded People/Note reads, preserve caller-role intersection, and retain
   the shipped reviewer read-only policy. No role change is authorized here.
3. Immutable per-event actor history remains unimplemented/unproved in the
   Follow-ups Task JSON path. A successful install would not close this gate.
   Real Files, Remote DOM, persistence/reload, scope and allowed/denied identity
   receipts remain outstanding.

Clover guide/runtime owner `01a09b1b-2239-7c80-b4e0-6e014cef51a5` confirmed no
concurrent sync/deploy and was notified that Finance has no active apply window.
Future shared-host mutations must serialize with that owner and recovery custody.
Coordinator was notified of the actual CLI boundary and permission finding.
Routing class: consequential authorization/runtime integration; Astra high is
the reference's review candidate, while actual inherited setting is not
independently observed here. No model interruption or cost claim was made.
No App apply/install, grant, customer import, provider/mailbox access, send,
host rollout, push or merge occurred. Linear milestone reconciliation remains
with the coordinator; no Linear connector is available in this task.

## Installation lead handoff — 2026-09-14

Runtime owner is now `01a09cd2-9ab9-76a3-97d4-37d2300a65a8`, with actual incoming
acknowledgment and outgoing custody acknowledgment on this date. Coordinator
remains `01a09c1e-fcec-7721-bafe-fd0ec677127c`; same Delivery Room job and issues.
Outgoing source lead `01a09cb1-b6c6-73b3-84c2-a167ea0c0ceb` owns no runtime edits,
CLI watcher, apply, install, role change or live Workspace operation. The only
retained process is synthetic loopback preview PID 97526, port 4347.

User now authorizes installation/testing and explicitly prefers Twenty CLI sync.
This supersedes the earlier no-install hold for this bounded gate only. Prefer
an existing disposable/test Workspace before Hass; do not create one silently.
Inspect configured remote, installed App/host compatibility and effective roles;
preserve installed working revision and a verified rollback path. Use the pinned
CLI's `yarn twenty plan` then reviewed `yarn twenty apply` for shared Hass;
`yarn twenty dev` is appropriate only with one sync owner on a verified test
Workspace. No `--force`, new grants, customer PDF imports, provider/mailbox reads,
email sends, unrelated host changes, auto merge or blind push. Dev sync does not
run install hooks; inspect whether a separate governed hook path is needed.

Accepted source: `f87cfc5296bcb036f79eaac6581b77cab9d6d0c1`, tree
`2be1697914916a4a6dddbadef8ceedb37ceee812`, branch
`codex/finance-follow-up-mutation`, worktree `/Users/mhoooo/.codex/worktrees/90cd/mhoo-twenty-next`.
App root `packages/twenty-apps/internal/mhoo-finance`, `@mhoo/finance` 0.1.0,
application UID `ad100496-8c49-4453-9814-886ac4064d4c`. Both installed SDK/client
package metadata are 2.37.0; manifest requires server 2.37.0. Source provenance
pins upstream `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58` via `.twenty-source`.
Reuse 51 focused test receipts, build/typecheck/lint, custody/trajectory, exact-head
independent review, desktop/mobile and complete local synthetic workflow proof.

Existing built output is `.twenty/output` (local build, not installed):
- manifest SHA-256 `efca5a8fbff7e48f2fd5e984d9cfa9710ce5f046decfda2021bdeae5f2642edc`;
- package.json SHA-256 `ba2f6eddf71f741ccb5719d47cd91162baea29ba9fbaf3c877076b2693a66460`;
- source yarn.lock SHA-256 `214db49994e0accaa49d2ed2567a39ad243af7a21d45ece63b6b32c6e555fdad`.
These hashes identify this retained build; inspect/review the actual CLI plan and
build input at the installation owner's checkout before synchronization.

Concrete authority gate found in the generated manifest: default App role
`a4c0b84d-a3cb-4cff-b1db-b555545e91f0` denies updates to native Task
`20202020-1ba1-48ba-bc83-ef7e5990ed10`, and has no People/Notes read entries.
The v2.37 authorization reference says the user token is user-role intersected
with App-role. Thus an existing user writer alone may not suffice. Verify actual
installed ceiling and metadata writability. If confirmed, present the smallest
scoped App Task-write/People-and-Note-read decision; do not grant admin rights or
change any role silently. The earlier suggestion that an existing writer alone
might suffice was unproved and is superseded by this explicit ceiling finding.

Current Hass host digest, installed App revision, CLI target, test Workspace,
allowed/denied identities and rollback artifact are **not verified here**. The
fresh installation lead owns that live discovery; no old receipt substitutes for
it. Governance read: lifecycle, workspace-operations and authorization SKILL.md
plus focused v2.37 references under the coordinating mhoo repository; auth-approval
and delivery-flow were also read. Work class is consequential authorization/runtime
validation; routing trial suggests Astra high review. Actual incoming model/effort
is coordinator-owned and unknown here; no override was made during active work.

## Current source workflow — 2026-09-14 continuation

ARCHITECTURE IMPACT: LOCAL. This section supersedes earlier read-only UI status
for native Task Follow-ups only. User explicitly resumed the functioning source
workflow from `5b58e0ee5889e201398d5bb30557b7e9e33b1ca7`; same owner, worktree,
branch, MHO-7/MHO-135/MHO-146 and Delivery Room `finance-native-review-ui`.

Implemented and wired to the actual Finance UI:

- Create one native Task from a readable active transaction and a neutral question.
  The caller's existing native Task permission is required. An uncertain creation
  retains its UUID and exact request; receipt verification precedes success.
- Choose a readable existing Person (bounded first 50), record their role and
  explicit recipient selection without invitation or a grant.
- Submit an explicitly unverified explanation shared with Task readers, or attach
  a retained SourceArtifact reference after checking readable ID, hash and status.
  These are reference attachments, not new uploaded bytes or original Files proof.
- Persist exact sender label, recipients, subject, body and source-reference
  attachments; reset approval on edits; approve only the reloaded stored draft.
  `APPROVED_NOT_SENT` has no mailbox or send effect. Sender label is not mailbox
  authorization. Recipients do not acquire source access from a draft reference.
- Manually propose a readable native Note as a reply reference, confirming the
  exact Task key and explicit sharing. Note content is not copied; mailbox origin
  remains unverified. Accept only the selected evidence kind/reference pair.
- Review/resolve/reopen native Task state with no reconciliation effect. Resolved
  Tasks must reopen before changing evidence or a request. Reload and denial/error
  controls are visible; failed writes are not optimistically displayed as saved.

All writes use native caller-scoped REST permissions; role manifests, application
writer and public event routes are unchanged. Generic Task permissions remain the
host authority. Client validation is not an independent security boundary or an
immutable ledger. Native Task createdBy/updatedBy describe host record activity;
Task JSON history does not prove durable per-event actor/time immutability or
importer/reviewer segregation. Source reference/hash provenance and user assertions
stay distinct. Same-millisecond edits outside financeRevision remain a concurrency
limit. Runtime authorization is not inferred from the SDK runAs option.

Verification: 51 focused tests across workflow, existing Task adapter, read adapter
and follow-up contract; changed-file lint, test-project typecheck and native App
build. Baseline 271-test/build/UI receipts are reused for unchanged behavior.
Independent source review accepted the corrected workflow: exact evidence identity,
full-list review, uncertain creation custody, stored approval and visible failures.
Final review caught and fixed a static-sample Reload action that could invoke the
Workspace reader; both the control and handler now preserve sample isolation.
The previously suspected second-create defect was withdrawn after verifying the
create form unmounts; explicit reset is retained defensively.

Local browser proof uses `node scripts/preview-follow-up-workflow.mjs`, loopback
port 4347. It renders the real UI and actual REST adapters against the explicit
synthetic transport under `src/__tests__/fixtures/follow-up-test-host.ts`; local
browser storage retains only synthetic Tasks across reload. Verified creation,
Person choice, explanation, hash-backed attachment, exact multiline draft,
approved-not-sent persistence after reload, explicit reply linking, denied review
with unchanged evidence, successful review, resolution and a second distinct Task.
Desktop light and 390px dark forms were inspected; document width equals 390px.
This preview is not a Twenty installation or a hosted authorization receipt.

Exact remaining runtime gate: separately authorized disposable-Workspace install
and allowed/denied identities across Task, Person, SourceArtifact and Note access;
real REST create/update/readback, scope switching, persistence after reload and
concurrency, native Files availability, Remote DOM form behavior and dark theme.
The shipped Finance reviewer remains read-only: it should deny these writes until
a separately authorized native role policy permits them. No new grant is made by
this source increment. Immutable investigation-event persistence and per-event
host actor custody remain separate unimplemented acceptance requirements.
Provider ingestion, mailbox reply ingestion, sending, live customer PDFs, grants,
install/deployment/merge/push remain outside this assignment. No external gate is
reported as passed. Coordinator owns those decisions; no duplicate lead exists.

## Bounded lead handoff — 2026-09-14

Delivery Room `finance-native-review-ui`, primary MHO-7, related MHO-135/MHO-146.
New retained lead: `01a09cb1-b6c6-73b3-84c2-a167ea0c0ceb`; coordinator:
`01a09c1e-fcec-7721-bafe-fd0ec677127c`. Previous lead
`01a09b96-78c7-7362-a9b2-c8142cdf1261` remains in job history and is not archived
because its other Clover ownership has not been checked.

Implementation remains in `mhoo-os/mhoo-twenty-next`, fresh worktree
`/Users/mhoooo/.codex/worktrees/90cd/mhoo-twenty-next`, branch
`codex/finance-follow-up-mutation`, based directly on accepted commit
`86ee71aaa38d7b64fc1d361150c58cc69ca28c1c`, tree
`7c2797a58a9d3f13ab700bb1e5b8bf8c827543a0`. Instructions read through
`AGENTS.md` → `CLAUDE.md` at that commit, plus delivery-flow. This file and
`INVESTIGATION_UI.md` retain the acceptance/run ledger. No PR or push in this handoff.
The product destination remains `finance-investigation-workspace`; migration is
not part of this increment.

Accepted baseline receipts retained from the previous lead: 271 tests,
lint/typecheck/build/custody and three independent contract, permission/provenance,
and desktop/mobile reviews. They are inherited source evidence, not rerun or
installed proof. No workers or operations have been dispatched by the new lead.
Job lead association transferred with revision check 10 → 11.

Authorized next step: inspect Twenty's existing user-scoped, row-bounded route
and implement the smallest source-only follow-up mutation improvement with
changed-input tests. Installed authorization is still unproved; native Task
creation, evidence attachments, persisted approved-not-sent drafts, reply
correlation and provider ingestion remain open. The coordinator owns future
authority decisions. No live grants, 42 Hass PDF imports, provider connections,
email sending, install, deployment, merge or blind push. Preserve the read-only
UI until its actual mutation prerequisites are satisfied.

### First follow-up increment: exact native Task write bounds

The existing `workspace-finance-follow-ups.ts` adapter now rejects a Task outside
the exact `MHOO_FINANCE_V1` scope before either state or approval writes and in
the final receipt. Native PATCH filters bind ID, scope, revision and `updatedAt`
together (native date equality compares a one-millisecond range). Invalid/overflowing revisions and noncanonical freshness timestamps
are rejected before requests; native denials propagate without a retry under a
different identity. This closes an adapter gap for callers who already possess
native Task write permission; it grants none.

Inspected host path: `RestApiCoreController` uses JWT, Workspace and custom
permission guards; `RestApiUpdateManyHandler` carries the parsed filter and auth
context into `CommonUpdateManyQueryRunnerService`; the common base runner builds
the filtered mutation with native row-level permissions. The SDK's `runAs: user`
selects its normal token channel (with the SDK's existing API-key fallback when
that token is absent); no application writer or public Finance route is enabled.
Do not infer an installed end-user identity receipt from that SDK option.

Changed-input validation: 20 focused adapter tests pass, plus two-file lint and
App test-project typecheck. Dependencies are reused through an ignored local
node_modules symlink to the previous accepted worktree; tests execute this
worktree's source. Unchanged 271-test baseline, build and UI reviews are retained.
No UI changed. Task creation, attachments, exact draft-content persistence and
immutable actor attribution still need a separately reviewed implementation;
the legacy approval adapter is not acceptance of those features. Hosted route,
role and concurrency proof remain open. Independent source review accepted
`c5dac052ab` with no actionable regression: native REST retains row-level
permissions, and native DATE_TIME equality handles API millisecond precision.
The revision coordinates Finance writers; same-millisecond native edits that
do not advance financeRevision are not universally detected. This is not an
exact database-timestamp compare-and-swap. Source custody and trajectory checks
passed for the implementation commit; the final receipt-only commit repeats
those exact-head checks without rerunning unchanged tests.

ARCHITECTURE IMPACT: LOCAL

This checkpoint maps the professional-method research into the transitional
native Twenty Finance source. It is implementation evidence, not an audit, AUP,
tax opinion, forensic conclusion, provider authorization, or installed/runtime
acceptance.

## Research custody

The mapping was checked against the actual files owned by research task
`01a09baa-7b49-7e00-834a-1af9ac3ef22b` on 2026-09-14:

- owning repository commit
  `7e3af2e2db89e89453ac33cd3a303939f941244a` on
  `codex/finance-investigation-methods-research`;

- `PROFESSIONAL_FINANCIAL_INVESTIGATION_METHODS.md` — SHA-256
  `73b18cf7a0f2b3c3ffe12c3f8fc8c22fe13546e4b68d332c12d9c3ac35530982`
- `SKILL_BLUEPRINT.md` — SHA-256
  `0e512ca1f2a0865b18e6da73af25fc3f47fdbe51b543633f70caeda442121135`
- `PRD_DELTAS.md` — SHA-256
  `b0b46bd47b0abf1fdf74de085bcede25aa10a0ec9ee6ecf6aa1b290cfacfdde5`

Those research files are durably tracked in their owning repository and are
not copied into this repository. Their professional
and provider sources remain cited in the owning artifact. This checkpoint pins
the reviewed content while keeping research custody and product custody
separate.

## Research to executable evidence

| Research principle and source                                                                                                           | Applicable native fields / relations                                                                                                                                                | Implemented rule                                                                                                                                                                                                                                                                                                                                                             | Exact test or evidence                                                                                                                                                                                               | Status                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence sufficiency, appropriateness and exact provenance — research §§2.2–2.4; AICPA AU-C 500 adaptation                              | `SourceArtifact.contentHash`, period/account/acquisition/original Files; `FinanceFact.artifact`, source locator, original amount/sign/raw values; Task Finance evidence attribution | Originals remain related and immutable; current-Workspace rows expose exact artifact/source references; invalid evidence context is withheld; link decisions never change classification                                                                                                                                                                                     | `finance-contract.test.ts` “replays exact golden totals and immutable source lineage”; `sample-evidence.test.ts`; `workspace-finance-data.test.ts`; `workspace-evidence-decisions.test.ts`                           | Implemented for existing records; original-file availability and hosted permissions remain unproved                                                                                                  |
| Completeness is a named, tested claim; missing/access-denied/zero differ — research §§2.2, 6.1; AU-C 500 and IRS Pub. 583 adaptations   | Existing `CoveragePeriod` projection plus sealed completeness receipt and sequenced `FinanceInvestigationEvent`                                                                     | Impossible dates/timezones, inactive lifecycle, count mismatch, review-before-acquisition and unknown procedures cannot become `PROVEN_COMPLETE`. `evaluatePeriodCompleteness` derives an inclusive month series from one entity/account/population/timezone/basis scope and requires each complete receipt to span the exact calendar month; missing is never zero activity | `completeness-receipt.test.ts`; `professional-investigation.test.ts`; statement missing-page/balance/continuity cases                                                                                                | Source contract implemented; no live receipt is populated and hosted completeness remains open                                                                                                       |
| Duplicate, lifecycle and transfer controls before classification — research §3.1; IRS IRM and Plaid adaptations                         | `FinanceFact` revision/status/artifact/account; `SourceArtifact` hash/supersession; import receipts; evidence-link identifiers                                                      | Exact duplicate IDs retain both acquisition refs but prevent a second entry. Explicit opposite-direction, same-amount, different-owned-account transfer refs link without income/expense reclassification. Unknown direction remains unknown                                                                                                                                 | `finance-contract.test.ts` duplicate, pending/revision, removal and reconciliation cases; `statement-importer.test.ts`; `evidence-linking.test.ts`; `finance-workspace.test.ts` transfer and unknown-direction cases | Implemented for existing deterministic contracts; no claim of live Plaid counterparty or full provider lifecycle coverage                                                                            |
| Explainable matching, deterministic precedence and ambiguity — research §§3.3, 3.6                                                      | `FinanceMatchGroup`, `FinanceMatchMember`, pair/candidate evaluation and immutable review events                                                                                    | Currency and direction conflicts fail to review. Split, batch and many-to-many groups recompute exact bounded minor-unit totals and residuals; zero residual is insufficient without one shared explicit reference. Originals and alternatives remain                                                                                                                        | `evidence-linking.test.ts`; `professional-investigation.test.ts` split/batch/many-to-many and residual cases                                                                                                         | Source/domain and native object manifests implemented; persistence of group snapshots from an authorized population remains unproved                                                                 |
| Human disposition and reversible history — research §§2.3, 4–6; GAO control adaptation                                                  | Immutable `FinanceInvestigationRun`; append-only `FinanceInvestigationEvent`; read-only reviewer role; non-assignable application writer                                            | A unique aggregate/sequence index, expected-head check, server actor/time, strict per-event payload parser, create-only field locks and exact receipt define an append-only event contract. Contradictory new evidence reopens without erasing the disposition. The earlier public event route was removed because its aggregate authorization was not yet safe.             | `professional-investigation.test.ts`; `workspace-investigation-events.test.ts`; generated manifest role/RLS/field-lock checks                                                                                        | Source and manifest contract implemented; there is no public event mutation route, and installed actor-role segregation plus administrator-level immutability remain runtime gates                   |
| Evidence request uses the smallest useful request and preserves people/privacy boundaries — research §§3.3, 4 and Skill 7               | Native Task identity plus immutable evidence/draft/approval/reply events; People IDs and source references                                                                          | The reducer supports Task creation receipt, evidence attachment, selected-Person draft, `APPROVED_NOT_SENT`, state transition and attributed reply correlation. It exposes `sendAuthorized: false`; no send event or mailbox action exists                                                                                                                                   | `professional-investigation.test.ts`; `finance-follow-up-contract.test.ts`; current Follow-ups UI read/preview paths                                                                                                 | Domain events are implemented and the UI is visibly read-only. Native Task create/attachment/message writes and mailbox reply ingestion remain deliberately disabled pending installed authorization |
| Follow-up closure is workflow, not reconciliation proof — research §§4–6                                                                | Finance Task state and native Task status remain separate from Finance facts, evidence link status and reconciliation exceptions                                                    | Only `READY_FOR_REVIEW → RESOLVED` is allowed; reopening is explicit. `RESOLVED` maps to native Task `DONE` with constant `NO_RECONCILIATION_EFFECT`; neither a reply nor draft approval changes a financial fact or reconciliation state                                                                                                                                    | `finance-follow-up-contract.test.ts` status/effect and transition cases; `workspace-finance-follow-ups.test.ts` exact receipt tests                                                                                  | Implemented and source-verified; a future close receipt must still decide planning eligibility separately                                                                                            |
| Neutral questions; no product-authored blame, assurance or tax conclusion — research §§1.2, 3.5, 9; AICPA/ACFE/IRS boundary adaptations | Native Task title is retained by Twenty; the Finance read adapter supplies a routed display question and route state                                                                | Misconduct wording is displayed as a neutral scoped-movement question. Audit/AUP/tax/legal conclusion wording routes to qualified professional review. The original Task record is not overwritten                                                                                                                                                                           | `finance-follow-up-contract.test.ts` conclusion-routing matrix; `workspace-finance-data.test.ts`; UI warning path in `finance-workspace.tsx`                                                                         | Implemented for Follow-up display. A complete engagement-mode envelope, external professional report relation and repository-wide professional-language lint remain unimplemented                    |

Quantitative Workspace views fail closed: any paginated source result, mixed or unavailable currency, oversized fact, or overflowing directional sum withholds aggregate totals and the timeline chart. Individual facts render exact minor units with their own validated currency. The legacy Task mutation adapter now uses a filtered `financeRevision` compare-and-swap plus exact operation receipt, but the shipped reviewer role is read-only and Task rows are restricted by an exact `MHOO_FINANCE_V1` scope field rather than correlation-key substring matching. The UI visibly keeps Task and evidence actions disabled; it cannot treat that adapter as installed mutation authority. Evidence history refuses a full log before attempting another write.

## Explicit remaining requirements

The following research requirements are real but outside this candidate's
implemented contract. They must not be inferred from the UI, fixtures, fields,
or passing tests:

- persistence receipts for immutable run and match-group snapshots from an
  authorized Workspace population;
- live Plaid pending/posted/removed/replacement ingestion and nullable
  counterparty evidence (the reducer rejects self, nonexistent and invalid
  lifecycle transitions, but no provider population is connected);
- live Clover sale, tax, tip, charge, refund, adjustment, tender,
  batch-to-funding and bank inputs (the component bridge validates every known
  value, keeps cash out of card funding, exposes gaps plus contradictions and
  never upgrades arithmetic equality to reconciliation; no provider population
  is connected);
- owner/related-party economic-flow review and qualified classification;
- operational thresholds separated from external professional materiality;
- historical cutoff/monthly close receipts and reviewed/partial/assumption
  planning inputs;
- importer/proposer versus reviewer segregation proven from hosted identities;
- source preservation/legal-hold routing, external professional-report
  relation, and whole-product prohibited-conclusion lint;
- live provider reads, real customer imports, email sends, new OAuth/mailbox
  scopes, deployment, and installed production acceptance.

These are not silently deferred as “done.” The current install gate remains
closed. This source candidate proves native pages, current-Workspace reads,
permission/error behavior, timeline interaction, immutable event contracts and
bounded domain reducers. It does not expose an event mutation route and does
not yet prove installed event persistence, native Task creation/attachments,
provider populations, mailbox correlation or production acceptance.
