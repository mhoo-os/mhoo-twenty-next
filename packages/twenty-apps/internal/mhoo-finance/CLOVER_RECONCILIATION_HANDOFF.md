# Clover-to-Finance reconciliation handoff

Status: **design only; no live Finance permission or import was added**.

ARCHITECTURE IMPACT: CROSS-SYSTEM

## Boundary

`@mhoo/clover` owns Clover credentials, provider REST/Export calls, bounded
pagination, connection grants, payment revisions, and import receipts.
`@mhoo/finance` owns normalization, source-account mapping, reconciliation and
human review. Finance must not call `api.clover.com` or receive a Clover token.

Clover is represented in Finance as a `FinancialAccount` with
`sourceKind=POS`, for example a masked `HASS KITCHEN Clover` account label.
Its facts remain linked to that POS account just like bank and card facts; the
provider connection itself remains Clover App authority, not a Finance account
credential.

## Read path

The future Finance logic function should use an authorized Twenty
`RestApiClient` to read the Clover App's persisted records:

1. Read `/rest/cloverImportReceipts` for the selected connection and period.
2. Require the receipt to be authorized for the current Workspace, have
   `dataset=payments`, a bounded `fromMs`/`toMs`, aligned `offset`, bounded
   `rowCount`, and a consistent `nextOffset`.
3. Read `/rest/cloverPaymentRevisions` for the receipt's connection and page.
4. Verify every returned revision belongs to the accepted receipt and has a
   unique `revisionKey`.
5. Convert only verified rows into Finance source evidence/facts. Keep the
   source receipt and provider identity attached to every row.

The REST read is a Twenty API read of App-owned records; it is not a second
Clover integration. The caller's Twenty role and an explicit cross-App read
permission must authorize the read. A caller-supplied connection or Workspace
ID is only a selector, never authority.

## Mapping that still needs an accepted contract

The current Clover revision has payment identity, minor amount, timestamps,
result, voided state, and a nullable currency code. Finance additionally needs
an explicit POS account key, currency, sign convention, source artifact/receipt
identity, and a monotonic observation revision. Until these are defined:

- classification remains `UNKNOWN`;
- coverage remains `PARTIAL` or `UNKNOWN`;
- no row is promoted to reconciled revenue, expense, or complete historical
  coverage;
- missing currency/account/source controls fail closed rather than becoming
  zero or an inferred account.

## Historical coverage

The REST all-payments path is an incremental source with a documented 90-day
window. It is not the six-year historical source. Historical coverage requires
separately proved Clover Export API windows, immutable export-file receipts, and
an overlap check before Finance uses the rows for reconciliation.

The current Hass provider probe shows that a single lower-bound payment read
works but the tested two-sided date-range forms return provider `400`. The
Finance handoff remains blocked on a successful bounded payment-range probe;
never widen the range or infer completeness from the single-bound result.

## Implementation gate

Before adding the Finance function, approve the cross-App permission path and
the mapping contract above. Then add a bounded, idempotent reader with page
receipts and tests for denied access, duplicate revisions, missing receipts,
partial coverage, currency ambiguity, and retry/replay behavior.
