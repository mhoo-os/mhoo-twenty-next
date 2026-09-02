# Mhoo Finance contract-only boundary

This directory contains the contract evaluator and synthetic unit tests for
the proposed Finance Gate 0 boundary. It is not an installable Twenty App: it
has no `application.config`, application metadata, Workspace declarations,
provider connector, credentials, runtime route, job, MCP tool, seed, install,
or deployment behavior.

The normative source is
`mhoo-os/mhoo/docs/architecture/finance/ENGAGEMENT_AUTHORITY_CONTRACT.md` and
its templates. The evaluator re-expresses only the deterministic checks needed
to keep future acquisition, personal-data, first-tranche, and
`PROVEN_COMPLETE` decisions fail-closed. It never calls Twenty or a provider.

The clean-foundation repository remains the source owner for a future
`@mhoo/finance` App. Historical `mhoo-os/mhoo-twenty` work is not imported.

ARCHITECTURE IMPACT: CROSS-SYSTEM
