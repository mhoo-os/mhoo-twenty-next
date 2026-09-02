# Finance App source provenance

## Destination

- Repository: mhoo-os/mhoo-twenty-next
- Port base: origin/main at
  75926be92be71ed66a01d98eebadf5403179503a
- Upstream source: twentyhq/twenty
- Upstream ref: refs/tags/twenty/v2.37.0
- Upstream commit:
  6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58
- Upstream tree:
  3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca
- SDK/client: 2.37.0

## Legacy seed and exact lineage

The source seed is the unmerged
mhoo-os/mhoo-twenty PR #45:
https://github.com/mhoo-os/mhoo-twenty/pull/45

- PR base:
  cbf80755521cee7b0e3fbea0c9d17eaf7582b1a7
- feature commit:
  6fe5e1576e25b857f54a9af326f5f4aec73101ca
- recorded PR head:
  6bef8da9004ea67607315422454a6aa52a65dfd3

The port copied source concepts selectively and reconciled them against the
target framework. No legacy commit was cherry-picked or merged.

PR #45 changed these Finance paths:

- package, lockfile, README, generator, and fixture JSON;
- fixture source and fixture unit tests;
- universal identifiers;
- five objects: source artifact, import receipt, finance fact, coverage
  period, and reconciliation exception;
- five object views;
- the dashboard front component, standalone page layout, and navigation item.

The old App tree also contained provider-era inherited paths:
src/clover/permissions.ts,
src/connection-providers/clover.connection-provider.ts,
src/logic-functions/clover-connection-status.logic-function.ts,
src/roles/clover-reader.role.ts, and Clover compatibility metadata. Those
paths are intentionally not present in this Phase A port.

## Evidence limits

This provenance records source custody and deterministic local validation. It
does not claim a live Workspace install, OAuth authorization, provider access,
cross-Workspace denial, production deployment, or legal approval.
