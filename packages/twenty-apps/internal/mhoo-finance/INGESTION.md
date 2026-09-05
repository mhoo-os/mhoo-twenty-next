# Governed statement-import source contract

This source-only implementation reuses the merged `SourceArtifact`,
`ImportReceipt`, and `FinanceFact` object vocabulary. It does not create a
parallel ledger, store evidence outside those records, or install a workspace.

## Supported deterministic inputs

- QFX and OFX use a strict bank-statement subset: one account per artifact,
  unique `FITID`, `DTPOSTED`, signed `TRNAMT`, `NAME`, and statement period
  controls. `DTUSER`, when present, is retained as transaction date; `DTPOSTED`
  remains posting date. The amount sign, not `TRNTYPE`, determines normalized
  direction. `CORRECTFITID` and `CORRECTACTION` are rejected visibly until a
  separately versioned correction contract exists.
- `synthetic-bank-csv-v1` is a documented **synthetic-only** profile. It
  requires `Date`, `Posted Date`, `Description`, `Amount`, and `Transaction
  ID`, uses `MM/DD/YYYY`, and maps a signed USD amount with positive=inflow and
  negative=outflow. No actual bank or card institution profile is claimed.
- PDFs are retained as immutable byte receipts only. Missing-page metadata can
  keep coverage incomplete, but this implementation does not extract PDF text
  or use OCR. That evaluation remains MHO-254 ownership.

## Custody and import rules

Every retained artifact receipt includes account scope, original filename, MIME
kind, byte length, SHA-256 over the exact bytes (including BOM and newlines),
acquisition time/actor, source format, and parser profile/version. A changed
artifact needs an explicit retained predecessor. A mapping-profile reparse uses
the same retained artifact identity and does not create a second original
receipt.

Rows retain their unmodified source values, file-row/QFX location, normalized
minor-unit amount, transaction/posting dates, and account/artifact-scoped
revision lineage. They remain `UNCLASSIFIED` and `SOURCE_UNRECONCILED`, so a
parser result cannot assert an expense, revenue, or reconciled coverage total.

Imports use integer row offsets bound to account and SHA-256. A partial import
persists no completed artifact receipt; only the matching persisted checkpoint
can resume it. Duplicate artifacts, rejected rows, partial work, and imports
with row rejections have distinct receipt statuses. No importer outcome can
assert `PROVEN_COMPLETE`.

## Synthetic fixture proof

`yarn fixtures:validate-ingestion` reads the committed CSV/QFX/PDF fixtures,
prints reproducible receipts, verifies the QFX period equation, and records a
synthetic missing-page condition. Its output is source proof only.

## Explicit remaining acceptance gaps

No real or redacted institution CSV profile has been received or verified. No
customer/provider artifact, account number, credential, PDF extraction/OCR,
installation, deployment, or live import was used. Statement deposit/payment/
fee/interest summary controls, cross-period account continuity, and client
release acceptance await authorized first-party source evidence under
MHO-183, MHO-227, and MHO-228.
