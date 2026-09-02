# @mhoo/finance

@mhoo/finance is the MHO-146 Phase A fixture-first Finance App vertical
slice for Twenty v2.37. It demonstrates:

synthetic source artifacts → immutable import receipts → normalized
revision-aware facts → coverage summaries → deterministic reconciliation
exceptions → native Twenty views/dashboard → bounded artifact-row trace.

All fixture values are synthetic. The front component is a local read-only
preview and does not call Clover, Plaid, a provider, a connection, or a
Workspace API. Amounts are calculated in the deterministic fixture procedure
using integer cents; the UI only formats those results.

## Scope and authority

- Twenty remains the sole Workspace, identity, membership, role, record, and
  authorization authority.
- The Finance reviewer role can read only the five native Finance objects and
  cannot write records, change settings, access tools, or operate an API key.
- CLOVER is only a synthetic source-kind label used to exercise the
  Toast-first/Clover-later overlap and gap cases. No Clover OAuth or provider
  configuration is declared.
- fixtures/authorization-cases.json contains redacted decision vectors for
  tests and review. It is not a replacement for Twenty runtime authorization
  proof.

## Deterministic procedure

From this directory:

    yarn install --immutable
    yarn fixtures:generate
    yarn test:unit
    yarn render:evidence
    yarn lint
    yarn typecheck

yarn fixtures:generate always resets
fixtures/mhoo-finance-fixture-pack.json from the corrected fixture variant
with generated timestamp 2026-09-01T00:00:00.000Z. The generated pack is
redacted and contains no credentials, tokens, customer records, or provider
responses.

yarn render:evidence renders all seven front-component states through the
current React/Vitest toolchain and writes
evidence/rendered-state-receipt.json and evidence/rendered-states.html. Those
are local rendered-state evidence only; they do not establish installation,
role denial, cross-Workspace, or production behavior.

## Validation boundary

The old PR reported a 5.66 second common loop excluding installation. This
port records a fresh timing receipt after the target package is installed and
validated. The historical number is not reused as current proof.

ARCHITECTURE IMPACT: CROSS-SYSTEM
