# mhoo-twenty-next operating contract

`AGENTS.md` is a symlink to this file. Keep that single instruction source;
read any applicable deeper instructions before editing. The user/coordinator's
current scoped authorization and accepted architecture govern the work.

## Identity and ownership

This repository starts from exact upstream Twenty v2.37.0. Preserve that
ancestry and `.twenty-source`; never merge, cherry-pick, or import commits from
legacy `mhoo-os/mhoo-twenty`. The allowed source overlay is enumerated in
[clean-foundation-overlay.md](docs/provenance/clean-foundation-overlay.md).
Existing overlays are source evidence, not blanket permission for new behavior.
Do not add branding, Apps, credentials, customer data or production behavior
before the applicable foundation gate and explicit scoped authority exist.

[ADR-0009](https://github.com/mhoo-os/mhoo/blob/abdc2be8a2adb6d979905db8bcf6a3ae6c41225c/ADR/0009-finance-six-year-forensic-review.md)
assigns native `@mhoo/finance` here. It amends Finance only: do not silently
reassign ADR-0008's other Apps or `@mhoo/core`, or activate the legacy separate
Core repository. Twenty owns Workspace identity, permissions and native data
primitives; providers retain authority for their facts. Architecture changes
belong in `mhoo`; deployment, networking, backups and recovery in `infrastructure`.
Use the pinned ownership/context links in [README.md](README.md); generated
central context is maintained by its owner, not copied into a new local authority.

## Start and verify

1. Identify the remote default branch and exact base/head, inspect `git status`
   and worktrees, and preserve other workers' dirty or uncommitted work. An old
   detached checkout is historical context, not current `main`.
2. Read the existing MHO issue, PR, run ledger and coordinator handoff before
   probes. Reuse exact-head receipts and accepted journeys. A stale all-green
   receipt does not override a later CI failure; source proof is not runtime proof.
3. Work in one isolated checkout for the assigned scope. Reuse the retained
   worker; do not create or dispatch duplicate owners. Custody changes require
   explicit acknowledgment on both sides. Setup is not feature dispatch.
4. Inspect `package.json`, `nx.json` and relevant project/package scripts. Use
   the smallest relevant checks listed in README. Run
   `bash scripts/provenance/verify-source.sh <head-sha>` before claiming custody,
   and the exact-head trajectory fixture before claiming overlay compliance.
   Neither replaces review or runtime acceptance. Avoid redundant full builds;
   coordinate genuinely necessary heavy runs with the existing owner.

Before continuation or handoff, record the primary issue (or explicitly none), implementation-owning repository, coordinating repo head and retained worker (or none), exact source commit and PR/evidence links, existing run-ledger location, dependencies/blockers and their owners (or explicitly none/unknown), and the authorized next step. Carry this mapping into the handoff and acknowledge the authoritative instructions commit and reading path. Resolve unknown or conflicting ownership with the owning head before dependent work; a project label or issue status does not grant authority or create a new task.

## Continue, finish, or escalate

Continue safe, reversible work within the authorized scope without repeated
permission requests. Report concrete findings and visible progress. Preserve
existing PR37 completion, email combined-release hold and accepted Finance
journeys; use their linked issue ledgers rather than restarting completed work.

Finish with exact repository/base/head/branch, changed paths, commit or PR,
checks and their limits, remaining acceptance, and the retained owner/next step.
A blocked or completed increment stays idle until new evidence or scoped work
arrives; do not invent busywork. Keep source, CI, independent review, immutable
artifact, installed App, runtime, recovery and release approval separate.

Escalate a concrete ownership conflict, missing artifact, destructive step,
security/cost change or required authority to the coordinator. Existing setup
or source authorization does not permit merge, deployment, App apply, credential
handling, live provider/data access, email sending, service pauses or reboot.
Keep secrets out of Git and receipts. Never weaken a gate to obtain green CI.

Classify cleanup candidates only unless deletion is explicitly authorized.
A prunable worktree, old branch, duplicate-looking folder or stale receipt may
still belong to a retained worker; preserve it until ownership is established.
