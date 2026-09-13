# Professional investigation method acceptance map

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
