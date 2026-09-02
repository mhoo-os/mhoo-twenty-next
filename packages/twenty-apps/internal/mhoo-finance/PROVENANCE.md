# Provenance and scope

- Destination repository: `mhoo-os/mhoo-twenty-next`
- Destination path: `packages/twenty-apps/internal/mhoo-finance`
- Source foundation: upstream Twenty v2.37.0 commit
  `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`, tree
  `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`, as recorded by
  `.twenty-source`
- Governing contract: `mhoo-os/mhoo/docs/architecture/finance/ENGAGEMENT_AUTHORITY_CONTRACT.md`
- Governing architecture: Mhoo `ADR-0008`; Finance proposal `ADR-0009`
  remains Proposed
- Linear execution view: MHO-123; Linear is not repository, legal, provider,
  Workspace, or production authority

This change adds only a standalone, contract-only TypeScript evaluator and
synthetic tests. It does not add an application manifest, Twenty metadata,
roles, views, layout, route, job, MCP tool, provider integration, credential,
Workspace installation, customer data, import path, deployment, or production
behavior. No legacy source was imported or extracted; there is therefore no
legacy source trailer or data migration claim.

The evaluator was re-expressed from the governing contract rather than copied
from historical `mhoo-os/mhoo-twenty` work. Historical branches and PRs remain
evidence/porting input only.

Validation is limited to source verification, TypeScript type checking, lint,
and synthetic unit tests. Passing these checks proves neither a Twenty App,
provider capability, legal approval, Workspace authorization, runtime, nor
production readiness.
