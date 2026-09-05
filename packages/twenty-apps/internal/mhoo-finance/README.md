# @mhoo/finance

`@mhoo/finance` is the native Twenty fixture-first vertical slice for
synthetic finance evidence, coverage, reconciliation exceptions, and bounded
source lineage. It is deliberately provider-free and credential-free.

## Current boundary

- Canonical source: `mhoo-os/mhoo-twenty-next`
- Port seed: `mhoo-os/mhoo-twenty` PR #45 at
  `6bef8da9004ea67607315422454a6aa52a65dfd3`
- Data: deterministic, fully synthetic fixtures only
- Provider calls, OAuth, credentials, Hass records, installation, deployment,
  and production mutation: absent and not authorized

## What the fixture pack proves

`yarn fixtures:generate` materializes a deterministic fixture pack containing
bank, card, Toast, and Clover-shaped *synthetic* periods; duplicate artifacts
and rows; a correction revision; pending-to-posted activity; a refund, void,
discount, transfer, card payment, missing period, zero-activity period, stale
source, resolved control total, and open reconciliation exception.

The Finance audit page uses Twenty's own standalone-page navigation, native
graph widgets, Cards, status tags, callouts, buttons, and theme tokens. Its
front component has populated, loading, empty, partial, stale, failed, and
denied preview states. The dashboard ends one trace at an exact synthetic
artifact row; it does not make an assurance, fraud, or tax conclusion.

## Focused checks

```text
yarn install --immutable
yarn fixtures:generate
yarn test:unit
yarn lint
yarn typecheck
```

The local fixture preview is development evidence only. A single source-level
fixture adapter maps generated packs, native-object-shaped records, and
dashboard selection. Its explicit synthetic Workspace/role gate fails closed
for a missing role or another Workspace, but it is not runtime UI proof:
Workspace installation, server role and cross-workspace enforcement, and
client-visible proof remain separate Phase B gates. Real source adapters must
later write through these same objects and lineage contracts; no dashboard-only
authority is allowed.

See [PORTING.md](./PORTING.md) for the exact carry-forward/discard matrix.
