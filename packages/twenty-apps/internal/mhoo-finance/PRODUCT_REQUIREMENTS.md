# Finance investigation workspace

Status: consolidated product requirements and bounded implementation plan, September 7, 2026. This document records existing owner decisions and MHO146/Finance project requirements; explicitly proposed extensions are not implementation or operational authorization.

ARCHITECTURE IMPACT: LOCAL

## Product outcome

A reviewer should understand what source data is available, identify a justified reconciliation question, inspect the affected transactions, and verify the exact original evidence without needing an agent. Agents can help choose and explain the investigation, but cannot own arithmetic, source completeness or approved findings.

This is a purpose-built Finance App on Twenty, not a bookkeeping replacement or a collection of generic lists. Twenty owns identities, memberships, permissions, records, Files, workflows, App execution and native UI. Finance owns financial definitions and deterministic procedures inside that framework. Providers own their source facts; human reviewers own final dispositions. The owner has settled a standalone native Twenty Clover App as the owner of Clover connection lifecycle and ingestion. Finance consumes its authorized relevant data, never its credentials. Existing synthetic Cloudflare work and Data Analytics are governed consumers, not another authoritative ledger.

## Recorded owner decisions and current data

- Working horizon is approximately 2020–2026; do not repeatedly ask for exact dates. Actual examined periods must always be reported separately.
- Prepare the workspace model, functions and layouts using the data already available, before clients join with more data.
- The supplied recent exports came from the Finance plugin in ChatGPT using Plaid, according to the owner. This does not establish a live Workspace Plaid connection or independently attest the plugin's transformations.
- Available combined export contains 3,432 unique transactions, the union of checking/card exports, spanning 2024-09-02–2026-09-04. Never count the combined file and constituent files as separate populations.
- Twenty currently holds a bounded 20-row sample selection, two sample accounts and two partial source references. Samples remain UNCLASSIFIED, excluded from totals and unreconciled. Uploaded original Files and statement balance controls are not established.
- Known engagement inputs already recorded in Linear: Specialized Chubby Group LLC; Narttapart Sintupanpratu and Punnada Limphoka. Recorded names are not substitutes for the engagement/source attestations required by the existing gates.
- Host release approval applies to its existing frozen image/packet. PR36 App merge/install is separate. No new provider connection, import, permission expansion or production effect follows from this PRD.

## Core journey and screens

| Screen | Question answered | Required behavior |
| --- | --- | --- |
| Overview | What can I investigate now? | Engagement/actual source period, as-of/snapshot or explicit sample mode, coverage gaps, reconciliation state and bounded next action above any results. Never turn no data into zero activity. |
| Transactions | Which records explain this result? | Shared account/date/snapshot scope, exact money/currency/sign, description, classification/exclusion, record opening and bounded pagination. Native filtering/sorting first. Distinguish the loaded page from the full population. |
| Evidence | Can I verify it? | Fact → artifact → exact source row; original filename/hash/acquisition receipt, raw values, parser/source revision and original Files availability. Show missing/denied evidence honestly. |
| Accounts | Which source does this belong to? | Explicit bank/card identity and masked labels; no guessed ownership or automatic mapping by display name. |
| Coverage | What is missing or unproven? | Account/source/month evidence state; missing, partial, unreconciled and proven populations remain distinct. Status transitions require receipts. |
| Exceptions | Why does this matter and what next? | Deterministic rule, expected/observed/difference, scope, supporting/limiting evidence, reviewer state and a bounded evidence/reconciliation action. An exception is not a fraud finding. |

Use one native Finance navigation folder. Native saved views, App-owned page layouts and approved widgets/components are the presentation layer. The same financial definition and snapshot must drive UI, tools and exported dataset results. Do not add dashboard-local financial arithmetic.

## Intake: history and ongoing updates

Use governed original artifacts and append-only acquisition/import receipts before normalized records. Each row retains exact location, original values, currency/sign convention, parser identity and stable source identity. Duplicate imports/retries do not change counts or totals. Corrections create explicit revisions rather than silently replacing historical evidence.

Historical bank/card review uses machine-readable bank exports plus original statements as controls. Recent Plaid history cannot establish a six-year population. A future incremental connector must handle added/modified/removed rows, pagination/cursors and pending-to-posted transitions, then reconcile overlap with existing exports. The standalone Clover App owns Clover historical export and ongoing acquisition, with capability/merchant authorization and bounded ingestion. Finance owns settlement-specific financial modeling over its authorized outputs. No generic OAuth grant alone proves provider coverage or successful synchronization.

Reuse Twenty Connections in the provider-owning App when the protocol actually fits; keep one credential/refresh owner. Finance must not add a second Clover Connection provider, token reader, refresh loop or direct provider caller. Plaid's Item/token flow requires explicit integration design, not a guessed OAuth mapping. Reuse App logic functions, durable records/key-value progress and bounded jobs for adapters. No new connector vault, generic queue, ingestion service or datastore without the existing architecture/reuse process.

## Clover producer → Finance consumer dependency

This records the owner-settled product direction; the exact producer contract and its canonical architecture receipt are being coordinated with the existing native Clover owner, not invented in Finance. This PRD does not replace the required accepted authority/contract record or prove cross-App invocation/install dependencies. No silent migration of legacy connected accounts or broader credential reader is permitted. Both Apps remain within Twenty Workspace authority.

Before wiring a Finance consumer, record the reviewed producer object or bounded function identity and version, authorized merchant/location scope, immutable provider record ID/revision, source/effective/observed times, exact amount/currency/sign semantics, source artifact/row reference and acquisition/coverage limitations. These are Finance consumer requirements, not a claim that the producer fields or function already exist. Confirm object/field/row permissions and approved consumer delivery semantics against that exact contract. Any reconciliation projection stays traceable to producer facts and does not mutate or replace them.

Historical completion, pagination, removals/corrections and acquisition failures belong to the Clover producer contract. Financial eligibility, settlement/transfer classification, coverage qualification and reconciliation belong to Finance. Producer ingestion success does not mark Finance reconciled. Frontend connection controls belong to the Clover App; Finance may show authorized source status, not access tokens or duplicated connection management. Consumer wiring waits the reviewed source contract and synthetic parity/denial evidence; live activation remains separately gated.

## Deterministic reconciliation and review

The first complete procedure should be one account/month statement balance and continuity check against a named eligible snapshot. Explicitly record opening/closing controls, transaction eligibility, exact money, tolerance and exclusions. Separate internal transfers/card payments before interpreting revenue or expenses. Full restaurant procedures and many-to-many settlements remain existing later issue scope.

A completed validated import can trigger a bounded reconciliation function. Publish its run receipt and exception records through native APIs; use a native workflow to route a review/evidence task. Scope database-event triggers to relevant status changes and make retries idempotent. Do not run duplicate financial logic in UI, workflow Code steps and agent prompts.

Human review records disposition and its evidence; independent approval owns a final finding. Source intake, reconciliation, case review and published financial results are separate states. Full case/evidence-request/workpaper lifecycle belongs to MHO134, not an empty set of new screens in this increment.

## Data-driven and agent-guided visualization

The default workspace is constructed from App metadata: stable navigation, views, layouts and a catalog of approved components. Data fills these definitions as intake and procedures complete. The UI does not have to be regenerated from scratch on each import.

Preparation displays record counts, source limits and unreviewed samples, not financial totals. Qualified monetary charts require a server-defined metric, exact snapshot, account/period/currency/population/exclusions and lineage; totals must match tools and dataset consumers. Chart selection should open the same scoped records. Verify native drilldown before relying on it; otherwise use an explicit bounded control in an approved component.

A proposed later agent feature returns a validated flat proposal such as viewKey, accountId, period, snapshotId and explanation. A server boundary validates allowed keys and caller scope, retrieves deterministic data and chooses a known component. No arbitrary JS/HTML/SQL or agent arithmetic. Twenty v2.37 native agent response schemas allow only flat primitive properties, not nested arbitrary chart trees.

Native chat navigation has a source implementation, but the generic record-name tool's system-context lookup needs a targeted permission review before restricted Finance use. PR36 instead opens IDs from an authorized generated read. Arbitrary live agent→custom-widget synchronization is not established. The first proposed extension is ephemeral exploration with explicit results/refetch, not shared-layout writes. Persistence, concurrent viewers, freshness and cancellation require a reviewed contract before implementation. Native Finance voice and optional ChatGPT Apps/widgets are separate unverified extensions; MCP availability alone does not provide them.

## Implementation and acceptance status

| Increment | Status | Acceptance still required |
| --- | --- | --- |
| Shared exact-money/snapshot/read contracts | Merged source and synthetic proof (MHO257/258). | Actual eligible-population publication and parity on a deployed Workspace. |
| Accounts, preparation and saved sample read | Installed metadata/sample records; custom reader depended on host loader fix. | Actual post-release dashboard read, reload, denied roles and sample preservation. |
| PR36 navigation + transaction/evidence UI | Draft source; generated client, selected-row scope checks, missing-file/error behavior and read-only artifact grant. | Reviewed final head/CI, separate App install decision, real navigation/render and server permission proof. |
| Preparation count widgets | Source review replaces unqualified monetary sums with counts; no additional grants. | Actual native chart rendering, no-data versus failed/denied differentiation, record scope labels. |
| Qualified overview/chart→exception→fact→source | Existing required MHO146/135 journey, unfinished. | Same metric/snapshot parity, supporting/contrary evidence and next action; work without agent. |
| Full historical/incremental connectors, procedures and case lifecycle | Existing gated MHO125–134 work, unfinished. | Provider/source authority, complete-population and reviewer evidence per each issue. |
| Constrained generative view proposal | Design proposal only. | PRD acceptance of allowlist, scope contract and ephemeral behavior, permission/source-fidelity evals. |

## Concrete next install decision

Install only the reviewed PR36 App revision after the host operation settles. First produce a read-only SDK plan using the existing approved authentication path. Expected scope: one Finance folder and four view links; move existing Overview/Accounts into the folder; add/reorder native view fields while preserving IDs; add one sourceArtifact READ grant; update the existing component and page-layout widget configuration. No object deletion, new record import, provider variables, writes, settings rights or all-object reads are expected. Any additional plan operation requires investigation before apply.

Before asking for a merge/install decision, supply the exact commit, final CI, App manifest/component digests and reviewed plan, not a general request to continue. The frozen host image is not rebuilt for this App change. After explicit install authority, apply with the sole operator, read the post-plan and preserve an operation receipt.

Verify in the actual Workspace: Finance group and all permitted links; transaction fields/filtering/record opening; same 20 UNCLASSIFIED/excluded samples; selected transaction→correct artifact/row; original file unavailable notice; empty, loading, error/retry, selection change and reload; authorized reader and denied/cross-workspace access. Do not manufacture test identities or broaden roles merely to make a test pass. If representative identities are absent, record the exact missing proof and obtain only that bounded test setup decision. Count widgets must not be accepted as qualified money or complete coverage. Temporary setup key revocation follows completed setup, not source completion.

## Completion definition and boundaries

MHO146 closes only when the accepted deployed vertical slice lets a reviewer see a justified result, inspect its exception/facts, trace original evidence and reproduce it with appropriate permission and visual receipts. PR36 is one increment, not project completion. The six-year project closes only after all existing dependency gates, actual source coverage, deterministic runs, human review and final reporting/recovery acceptance are met.

No payment/transfer/refund initiation, automatic fraud finding, tax opinion, unrelated personal-account review, or implicit client publication. No new framework, identity system, datastore, workflow engine, credential authority or agent runtime.

References: [Finance project](https://linear.app/mhoo/project/mhoo-finance-hass-kitchen-six-year-forensic-review-da85b4d06e8e/overview), [MHO146](https://linear.app/mhoo/issue/MHO-146), [PR36](https://github.com/mhoo-os/mhoo-twenty-next/pull/36), existing App contracts/INGESTION.md/PREPARATION.md/INVESTIGATION_UI.md and accepted Mhoo ADR0008. The standalone Clover App dependency follows the September 7 owner decision; exact producer identifiers remain pending its owning lane. Framework source is pinned by .twenty-source; the separate research matrix records official upstream evidence and unverified capability limits.
