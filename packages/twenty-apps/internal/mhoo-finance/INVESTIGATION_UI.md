# Sample investigation UI increment

ARCHITECTURE IMPACT: LOCAL

## Hass product walkthrough — 2026-09-13 local source

The retained local `FinanceQuestionPrototype` now tells one coherent story:
historical source inventory, present question-to-evidence review, reconciliation
of duplicates/transfers/refunds/fees/settlements/invoice candidates, and future
scenario planning gated on reviewed actuals and explicit assumptions. Tax,
bank/Plaid, Clover and email/document examples retain separate source periods,
bases, provenance and limitations. Every item is visibly synthetic; Clover is
not connected, email is not represented as complete audit evidence, and forecast
output is withheld.

This is an additive local walkthrough on the current native Finance component,
not a new dashboard authority. It reuses the existing exact-money result,
chart-to-record filtering, record-to-source trace, scope invalidation, late-result
guard and empty/missing/denied/failed simulations. The canonical scope and
acceptance are in `HASS_FINANCE_PRODUCT_DEFINITION.md`; proposed guide copy is in
`HASS_WELCOME_GUIDE_COPY.md`. No live guide, Workspace, provider, customer data,
credential, OAuth scope or deployment was changed.

This App-only increment makes existing sample transactions and their evidence reachable. It does not change the frozen host image release candidate or install anything into a workspace.

Finance groups Overview, Accounts, Transactions, Evidence, Coverage and Exceptions using native v2.37 navigation folders and saved views. Transactions exposes existing date/account/description/exact minor-unit/currency/classification/exclusion/source fields; native records retain their normal opening and filtering behavior. The native record-label key remains visible first, as required by the live Twenty metadata validator. Other technical fields and the legacy numeric amount stay available but hidden by default. No object field or source record is changed.

The overview's saved samples now format USD integer text without floating-point conversion and offer **Inspect source evidence**. That action refetches exactly the selected sample, with the same unclassified/excluded filter, through the generated Core client. It reads the linked artifact in that permission-checked query. The panel shows source row/location, original amount/sign, recorded raw values and artifact metadata, and opens the native transaction/source record through the host navigation API. Missing original Files are explicitly unavailable. A Files reference is not represented as verified file bytes or complete custody.

Only sourceArtifact read access is added to the App reader ceiling. No settings, tools, writes, deletes, all-object reads, application run-as or credentials are added. The triggering user's role still intersects the App role. Native navigation visibility is governed by Twenty and the user's permissions. Sample filters and response checks protect the displayed scope; they do not implement authorization. Permission/network errors return no evidence and never retry with a broader query. Missing/mismatched/reclassified records return unavailable. Changing the selection or refreshing unmounts/clears the old evidence; pending responses are cancelled for presentation.

Local validation: App build and full TypeScript check, lint, 95 unit tests (including denied-read/no-fallback, wrong-record/scope changes, missing artifact/file and exact amount precision). Mocked denial tests prove client failure behavior only, not server or cross-workspace permission enforcement.

Before live acceptance, separately install the reviewed App revision after runtime readiness, then verify the native group, table filtering/record opening, 20 sample preservation, successful fact-to-source trace, missing-file notice, loading/empty/error/retry/selection changes, restricted-role and cross-workspace denial, and reload behavior. No live visual or permission proof is claimed here.

Remaining existing-scope gaps: live coverage/exception overview, snapshot-qualified charts and chart-to-filtered-record drilldown, original Files custody, full summary-to-exception-to-fact proof. Source review found two unqualified monetary SUM widgets. They now count records (open exceptions and unclassified facts), with a Record counts tab and explicit exploratory notice. No financial aggregate is promoted before a qualified snapshot metric exists. Complete procedures and case/finding review remain their existing later issues.

Source basis: accepted Twenty v2.37.0 and existing Finance App on main 3dc0083a178668a644395f6433459ef884827abd. Folder support is in NavigationMenuItemManifest.folderUniversalIdentifier and the server manifest converter; native record opening uses AppPath.RecordShowPage via twenty-sdk/front-component.navigate. No new framework or authority is introduced.

## Live metadata plan validation — 2026-09-07

The authenticated SDK dry-run found that the label identifier must remain visible at the lowest field position. The view now preserves that native contract, covered by a regression test. The corrected dry-run passed with 13 additions, 16 updates and 0 deletions. It adds seven view fields, five navigation items and one source-artifact READ permission; updates existing presentation metadata and the front component. No changes were applied. Local checks: 96 unit tests, SDK build/typecheck and lint passed. Live installed UI and restricted-role evidence remain separate acceptance steps.

## Source app handoff — 2026-09-07

The preparation screen now distinguishes financial accounts from provider connections. “Manage source apps” uses the supported host `navigate(AppPath.SettingsCatchAll, { '*': 'applications' })` to open Twenty's current-workspace Apps catalog. No provider install ID, workspace selector, external URL, credential input, metadata discovery query or new grant is introduced. Clover availability and connection state remain explicitly unverified here. Native Apps owns discovery and its actual permission checks. A rejected host navigation shows an error without fallback execution or a connection-success claim. Statement/CSV upload is visibly unavailable because this screen has no reviewed ingestion flow.

Exact source: SDK `front-component/functions/navigate.ts` and host `useFrontComponentExecutionContext.ts` support the native route; server `application-install.resolver.ts` requires APPLICATIONS for findOne/findManyApplications. Finance's role deliberately gains no such permission. Tests cover the Apps route, unavailable statement/CSV options, and rejected host navigation. The mocked rejection is not a live authorization test.

Validation: 100 unit tests, App build/full typecheck, lint and source custody pass. A static local render of the actual React source was produced; it has no active host navigation and does not prove sandbox behavior. The updated live SDK dry-run again passed with 13 additions, 16 updates and 0 deletions, with a new front-component checksum. No apply occurred. Existing 3a66255 plan remains historical evidence for the earlier component; installation requires the latest reviewed build and CI. After authorized installation, verify allowed/denied native Apps navigation in the real workspace, absence of connector-success claims, unavailable upload, and all 20 samples still unclassified/excluded.

## Question-to-evidence implementation trial — 2026-09-07

ARCHITECTURE IMPACT: LOCAL

MHO-146's authorized source/synthetic trial adds an explicit optional entry from
workspace preparation. It renders the actual Finance React component with fixed
invented fixtures; no data adapter, live agent, provider connection, Files read,
manifest, permission or host change is included. Existing saved-sample readers
and their accepted installed journeys are retained without repeating live reads.

Question, account, period, snapshot and simulation state produce one deterministic
result. Both outflow and excerpt-coverage charts use its records. A chart selection
filters contributing transactions; a transaction opens its matching synthetic CSV
row locator and excerpt, or an explicit unavailable state. Existing integer-money
contracts calculate totals. All seven fixtures are excluded from real totals.
Profit, fraud and unsupported questions return bounded explanations instead of
findings. Request identity and scope checks reject late responses and clear old
records/evidence; an old explanation is labeled stale while loading.

Changed-input check rationale: the new result/reducer and optional React surface
required focused scope, precision, selection, refusal and stale-response checks,
plus the existing preparation tests and native App compiler. No shared host or
dependency input changed, so whole-repository/Docker checks were not repeated.
Focused validation passed: 18 tests across two files, native `twenty dev:build`
(six files and typecheck), `tsgo --noEmit -p tsconfig.spec.json`, and four-file
lint with zero warnings/errors. Subsequent formatting changed no behavior.

Local browser verification used the actual component at `http://127.0.0.1:4331`:
January $750 / February $1400; February selection to row d4 / CSV row 5; missing
excerpt d6 / CSV row 7; coverage 3/3 and 3/4; reserve/February scope of one $200
record; six-year-profit refusal; loading/stale clear; a slow response superseded
by denial without restoring records; failed and empty responses. Browser logs
contained no errors/warnings. A 390-pixel layout had a 390-pixel document width
and stacked the panels. Desktop evidence and narrow-layout screenshots were
saved outside Git under the retained task's `finance-question-trial` artifact
folder. Snapshot consistency and remaining refusal cases also have unit proof.

Reproduce the local preview from this package with
`node scripts/preview-question-prototype.mjs` (port 4331 must be free), or use
`--build-only`. It binds loopback only and serves its generated local bundle;
generated files remain ignored under `.twenty/question-preview`. The retained
Finance task owns the preview process and its shutdown. This standalone React
preview does not establish Twenty Remote DOM execution, host navigation, live
Workspace switching, installed permissions or deployed behavior. Those require a
separately authorized disposable-Workspace acceptance step. No install, live
query/write, credential operation, push, merge or publication occurred here.

Custody/handoff: implementation owner `mhoo-twenty-next`; branch
`codex/finance-question-prototype`, exact base
`6a1dec473a3d6c303697bca044e3e7d3681e7b72` (merged PR39). Authoritative instructions
were adopted from `CLAUDE.md` at `4b760df705c085b8b00bd0fde08d3f6aeeacc852`
and its pinned README sources. Repo head task
`01a07aa7-944a-70c3-bf77-d51b9fc766f2` coordinates the retained Finance executor;
this section extends the existing receipt rather than creating another ledger.
Next owner action is source review of the local commit. No source dependency is
blocked; installed sandbox/role acceptance remains outside this trial.
