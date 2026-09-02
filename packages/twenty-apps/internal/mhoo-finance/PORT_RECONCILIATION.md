# MHO-146 old-PR to target reconciliation

This port is intentionally not a cherry-pick. The old PR head
6bef8da9004ea67607315422454a6aa52a65dfd3 was read as a source seed and each
surface was classified against mhoo-os/mhoo-twenty-next at
75926be92be71ed66a01d98eebadf5403179503a.

## Classification

### PORT_AS_IS with target formatting

- The five native objects and their two-sided relations:
  Source artifact, Import receipt, Finance fact, Coverage period, and
  Reconciliation exception.
- The five native table views for those objects.
- The standalone dashboard page layout, native rollup tab, and Finance
  navigation item.
- The deterministic artifact → receipt → row revision → normalized fact →
  coverage → exception → trace model.
- The redacted synthetic edge cases: duplicate file/row, retry, correction,
  pending-to-posted, Toast-first/Clover-later overlap, gap, stale input,
  refund, void, discount, transfer, card payment, missing data, zero
  activity, one resolved control total, and open differences.

### ADAPT_TO_CURRENT_CONTRACT

- application.config.ts: retained the old stable App identifier and display
  contract, but removed all server variables.
- src/roles/finance-reviewer.role.ts: replaced the old provider-specific
  zero-authority role with a fresh stable role identifier and least-privilege
  read permissions for the five Finance objects.
- src/constants/universal-identifiers.ts: retained object/view/front/page/nav
  identifiers; removed provider and logic-function identifiers; added the new
  reviewer-role identifier.
- package.json, .nvmrc, and evidence commands: aligned Node/React tooling
  with the target v2.37 workspace and added React server-rendering evidence.
- src/front-components/finance-audit-dashboard.front-component.tsx: kept
  the local state preview, exported the component and state list for
  deterministic rendering, and kept all arithmetic outside the UI.
- src/page-layouts/finance-audit-dashboard.page-layout.ts: added the native
  boolean includedInTotals = true filter to the amount rollup. The old
  chart summed excluded facts as well.
- src/fixtures/authorization-fixtures.ts and
  fixtures/authorization-cases.json: added redacted role, write, unassigned,
  and foreign-Workspace vectors. Twenty remains authoritative for decisions.
- README/provenance/evidence: replaced old destination and provider claims with
  exact target base/head lineage and local-only evidence limits.

### ALREADY_PRESENT

- Target repository upstream custody at Twenty v2.37.0.
- Current target App SDK/build conventions and React 19 toolchain.
- Twenty Workspace identity, role, object, view, page-layout, and navigation
  authority.
- Target source-custody verifier and trajectory fixture.

## Path-level receipt

The complete old PR tree was reconciled as follows:

- .gitignore — PORT_AS_IS.
- .nvmrc — ADAPT_TO_CURRENT_CONTRACT: target Node 24.16.0.
- .oxlintrc.json — ADAPT_TO_CURRENT_CONTRACT: retained the App-local target
  lint boundary.
- .yarnrc.yml — ADAPT_TO_CURRENT_CONTRACT: retained standalone node-modules
  resolution.
- COMPATIBILITY.md — DISCARD_WITH_REASON: provider-era compatibility claims.
- PROVENANCE.md — ADAPT_TO_CURRENT_CONTRACT: destination and exact lineage
  rewritten for mhoo-twenty-next.
- README.md — ADAPT_TO_CURRENT_CONTRACT: provider-free Phase A procedure and
  evidence limits.
- fixtures/mhoo-finance-fixture-pack.json — ADAPT_TO_CURRENT_CONTRACT:
  regenerated from the corrected synthetic source.
- package.json — ADAPT_TO_CURRENT_CONTRACT: exact v2.37 dependencies and local
  render-evidence command.
- scripts/generate-fixture-pack.mjs — PORT_AS_IS with the target fixture
  procedure retained.
- src/__tests__/clover-connection-status.test.ts — DISCARD_WITH_REASON:
  live-Connection behavior is outside Phase A.
- src/__tests__/fixture-pack.test.ts — ADAPT_TO_CURRENT_CONTRACT: expanded
  coverage, redaction, receipt, and summary assertions.
- src/__tests__/manifest.test.ts — ADAPT_TO_CURRENT_CONTRACT: provider-free
  App and native reviewer-role assertions.
- src/application.config.ts — ADAPT_TO_CURRENT_CONTRACT: no server variables.
- src/clover/permissions.ts — DISCARD_WITH_REASON: provider permission
  vocabulary.
- src/connection-providers/clover.connection-provider.ts —
  DISCARD_WITH_REASON: OAuth and credential declarations.
- src/constants/universal-identifiers.ts — ADAPT_TO_CURRENT_CONTRACT: stable
  native IDs retained; provider IDs removed; reviewer ID added.
- src/fixtures/fixture-pack.ts — ADAPT_TO_CURRENT_CONTRACT: deterministic
  source-only pipeline retained and tested.
- src/fixtures/authorization-fixtures.ts — ADAPT_TO_CURRENT_CONTRACT: new
  redacted Twenty-boundary decision vectors.
- src/front-components/finance-audit-dashboard.front-component.tsx —
  ADAPT_TO_CURRENT_CONTRACT: exported render contract and retained local
  state-only behavior.
- src/logic-functions/clover-connection-status.logic-function.ts —
  DISCARD_WITH_REASON: live connection inspection and unresolved provider
  assumptions.
- src/navigation-menu-items/finance-audit-dashboard.navigation-menu-item.ts —
  PORT_AS_IS with target import formatting.
- src/objects/coverage-period.object.ts — PORT_AS_IS with target formatting.
- src/objects/finance-fact.object.ts — PORT_AS_IS with target formatting.
- src/objects/import-receipt.object.ts — PORT_AS_IS with target formatting.
- src/objects/reconciliation-exception.object.ts — PORT_AS_IS with target
  formatting.
- src/objects/source-artifact.object.ts — PORT_AS_IS with target formatting.
- src/page-layouts/finance-audit-dashboard.page-layout.ts —
  ADAPT_TO_CURRENT_CONTRACT: included-facts boolean filter added.
- src/roles/clover-reader.role.ts — DISCARD_WITH_REASON: provider-specific
  zero-authority role; replaced by finance-reviewer.role.ts.
- src/roles/finance-reviewer.role.ts — ADAPT_TO_CURRENT_CONTRACT: new
  default read-only native role.
- src/views/coverage-periods.view.ts — PORT_AS_IS with target formatting.
- src/views/finance-facts.view.ts — PORT_AS_IS with target formatting.
- src/views/import-receipts.view.ts — PORT_AS_IS with target formatting.
- src/views/reconciliation-exceptions.view.ts — PORT_AS_IS with target
  formatting.
- src/views/source-artifacts.view.ts — PORT_AS_IS with target formatting.
- tsconfig.json — ADAPT_TO_CURRENT_CONTRACT: target React JSX setting.
- tsconfig.spec.json — ADAPT_TO_CURRENT_CONTRACT: TSX source inclusion.
- vitest.unit.config.ts — ADAPT_TO_CURRENT_CONTRACT: source tests and render
  evidence.
- yarn.lock — ADAPT_TO_CURRENT_CONTRACT: regenerated for the adapted package.

### DISCARD_WITH_REASON

- src/clover/permissions.ts: provider permission vocabulary is outside the
  fixture-only Phase A contract.
- src/connection-providers/clover.connection-provider.ts: declares OAuth
  endpoints and credential variables, explicitly forbidden for this port.
- src/logic-functions/clover-connection-status.logic-function.ts: would
  inspect live Connections and carry unresolved Clover runtime assumptions.
- src/roles/clover-reader.role.ts: provider-specific and zero-authority; it
  cannot read the native Finance records needed by this dashboard.
- Old Clover server variables in application.config.ts.
- Old Clover COMPATIBILITY.md claims: they describe unresolved runtime
  compatibility, not a synthetic fixture proof.
- Twenty Files/Connection declarations: Phase A stores only generated,
  redacted fixture artifacts; introducing live storage or connection
  authority would expand the approved scope.

## Stop conditions

Stop before widening the port if the target SDK cannot express the native
object/role/page contract, if source custody rejects the Finance subtree, if a
validation step requires credentials/provider access, or if a reviewer asks
to promote local fixture evidence to live Workspace or production proof.
