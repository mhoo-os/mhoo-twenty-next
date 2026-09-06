# Finance logical contract v1 — MHO-257

This source-only contract extends the native Finance artifact, import receipt,
financial fact and coverage identities introduced by MHO-146. It adds no object,
database, App, API, migration or publication path. Twenty remains the authority.
The pinned framework/SDK is Twenty v2.37.0. ARCHITECTURE IMPACT: LOCAL.

## Ownership and compatibility

| Existing primitive | Contract field | Compatibility rule |
| --- | --- | --- |
| `sourceArtifact.artifactKey` | `artifacts[].artifactId` | Retain original bytes and SHA-256; hash alone proves neither completeness nor authorization. |
| `importReceipt.receiptKey`, artifact relation | `receiptId`, `artifactId`, acquisition controls | Receipt must bind actual retrieval/control evidence in a future governed importer. Strings here are references, not authorization tokens. |
| `financeFact.factKey`, source row, revision | `Observation.factKey`, `sourceRowKey`, `revision` | Retain every observation, including pending and removed revisions. v1 requires contiguous local revisions starting at 1 and stable source event/account identity. |
| `financeFact.amount`, source description/category | `sourceAmount`, `currency`, `signConvention`, original description/category | Preserve raw decimal text; compute signed minor-unit text without floating-point conversion. |
| `coveragePeriod.coverageKey` | `coverage[].coverageKey` | Legacy COMPLETE must not become verified source completeness. Missing pagination/control evidence stays UNKNOWN. |
| Reconciliation exception evidence | `links`, rejected-candidate reason | Explicit revision links and evidence; mismatches reject the candidate and preserve the prior baseline. No fuzzy matching. |

The Phase A number-based fixture adapter remains a presentation demo. `legacyCents`
accepts only safe integers and explicit two-decimal currency. It cannot recover
already-rounded values. Do not convert this contract's money strings through
`Number`, CSV type inference, or a floating-point notebook column. Do not map the
full signed 64-bit range to native CURRENCY/NUMBER fields without proving their
actual database and API limits. A future MHO-128 migration must preserve old
parser/schema identities, originals and hashes, supply the missing fields and
verify runtime persistence, relations, Workspace isolation and recovery. Existing
nullable relations are not proof of immutable custody. Supersede versions and
rebuild derivatives; never rewrite originals to fit v1.

## Exact money and dates

Amounts and aggregate results are bounded to ±9,223,372,036,854,775,807 minor units.
JSON uses `{ "currency": "USD", "minor": "9007199254740993" }`. CSV uses a header
`currency,minor` with both columns read as text. Python notebooks use `int(minor)`;
never float or a default pandas numeric inference. `moneyCsv`/`readMoneyCsv` provide
a strict lossless two-column interchange. The golden test crosses 2^53 and proves
JSON, CSV and exact addition. Supported v1 currencies are USD/THB/EUR/GBP (2), JPY
(0), KWD (3); all other codes and extra precision reject pending a version update.
No FX conversion or rounded discrepancy tolerance exists.

`INFLOW_POSITIVE` and `OUTFLOW_POSITIVE` describe account movement, including a
card liability's payment/charge convention. Source text is retained separately.
Ambiguous formatting/signs reject. DATE remains YYYY-MM-DD. INSTANT requires an
explicit UTC timestamp (up to milliseconds); other formats need a declared parser
and raw-source custody, not a fabricated midnight timestamp. Date selection uses
the supplied source calendar day; v1 does not convert business time zones.

## Population, revision and metrics

The manifest states requested and observed periods separately. Empty population
has null observed period. Nonempty observed bounds must equal received row dates.
Every artifact count and acquisition total reconciles to observations, including
duplicate acquisitions and superseded revisions. An artifact duplicate requires
an explicit original, identical hash/count and identical revision contents. Equal
amounts/descriptions on different source event identities remain separate facts.
No category, amount or fuzzy similarity establishes an identity or transfer.

A baseline selects explicit same-currency BANK accounts and one exact evidenced
coverage window per selected account. NO_ACTIVITY needs evidence and zero rows;
MISSING cannot become zero. Larger/multiple coverage windows require a future
explicit composition contract. Latest posted revisions inside scope are eligible;
pending, removed, superseded, duplicates and out-of-scope observations remain
visible in the population/exclusion receipt. CARD/POS rows are not bank cash.

`bank-movement/v1` sums positive movement as `observed_bank_inflows`, absolute
negative movement as `observed_bank_outflows`, and subtracts for `bank_cash_change`.
Transfers within scope cancel, transfers outside scope still move selected bank
cash, and bank-side card payments remain cash outflows. Explicit transfer/card
pairs require different accounts, equal/opposite same-currency values and evidence.
Refunds oppose their linked movement; reversals also balance exactly. Owner flows,
refunds and transfers are not automatically revenue/expense. Recognized revenue
and business expense are **only selected-bank observations** with explicit
classification/procedure references; they are not a complete P&L, accrual result
or approved finding. Unknown observations retain IDs and exact amounts in the
snapshot. Evidence-reference existence/authority must be checked by the future
Workspace-authorized caller, not inferred from these source tests.

## Snapshot, replay and scenario boundaries

`buildSnapshot` clones, validates and deep-freezes input, builds eligible/excluded
revision lists and hashes canonical manifest, facts and baseline content. Object
key order is normalized; observation order uses code-point identity ordering.
Manifest array order is part of its identity. Whole received artifacts are hashed
by the custody layer: the contract validates a digest's format, not possession of
those bytes. Golden source bytes and their digest are fabricated together.

COMPLETE retrieval/pagination, VERIFIED source controls plus references, no
truncation/rejects, and selected coverage are required. UNKNOWN/PARTIAL/FAILED
and derived conversational exports cannot mint an eligible baseline. These states
remain available on the caller's rejected manifest. `retainOrReplace` returns the
same prior verified object on rejection and has no persistence side effect.
A WeakSet prevents forged/deserialized snapshots from entering the local
replacement/scenario path: rehydrate by rebuilding and checking the expected hash.
This is local validation, **not** a signature, authorization check, transaction,
server tool or production publication gate. Synthetic eligibility never means
real-source eligibility. MHO-128 retains storage/security/recovery obligations.

Scenarios refer to baselineHash, have separate scenarioHash and immutable
assumptions, return hypothetical metrics and UNREVIEWED_HYPOTHESIS, and cannot
mutate observed facts or enter the baseline path as verified snapshots. Scenario
money deltas require the baseline currency and remain within the same bounds.

## Focused proof

Run from this App directory:

```
corepack yarn install --immutable
corepack yarn test:unit
corepack yarn typecheck
corepack yarn lint
```

`src/fixtures/contract-golden.ts` uses only fabricated accounts/events. Tests cover
large exact values, unsupported signs/dates/precision, legitimate repeats, duplicate
acquisition, corrections, pending/posting/removal, zero versus missing coverage,
transfer/card pairs, refunds/reversals/owner flows, deliberate reconciliation
mismatch, unknown source controls, immutable replay and scenario separation.
No source/fixture result establishes an installed App, real financial finding,
provider authority, reviewer approval, scale verdict or completed MHO-128.
