---
name: pr-trajectory-audit
description: Evaluate a pull request or exact head against this repository's clean-foundation contract.
---

# Clean-foundation trajectory evaluation

Read `CLAUDE.md`, `docs/provenance/clean-foundation-overlay.md`, and the source
custody receipt before judging a trajectory. Run
`scripts/exact-head-fixture.sh <base> <head>` before reporting that a pull
request respects the reset. The fixture is deterministic evidence only: a human
must still read the diff and the two rubric categories before approving a PR.

Never treat a legacy `mhoo-os/mhoo-twenty` commit, candidate, or runtime receipt
as evidence that a change in this repository is compliant.
