# Clean-foundation overlay

The base is upstream `twentyhq/twenty` at `refs/tags/twenty/v2.37.0`, commit
`6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`, tree
`3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`.

`mhoo-os/mhoo-twenty` is legacy evidence only. Its frozen main receipt is
`cbf80755521cee7b0e3fbea0c9d17eaf7582b1a7`; no legacy commit is merged or
cherry-picked into this repository.

Initial permitted overlay paths:

- `.twenty-source`
- `CLAUDE.md` (also reached through the upstream `AGENTS.md` symlink)
- `docs/provenance/clean-foundation-overlay.md`
- `scripts/provenance/verify-source.sh`

Later overlay commits append trajectory evaluation and the clean runtime CI to
this list. Nothing else is implicitly permitted.

Trajectory-eval paths:

- `.agents/trajectory-review.json`
- `.agents/skills/pr-trajectory-audit/SKILL.md`
- `.agents/skills/pr-trajectory-audit/references/failure-patterns.md`
- `.agents/skills/pr-trajectory-audit/scripts/exact-head-fixture.sh`
- `.github/workflows/trajectory-eval.yml`

Clean runtime paths:

- `.github/workflows/clean-foundation-ci.yml`
- `.github/workflows/clean-foundation-image.yml`
- `deploy/twenty-next/compose.yaml`
- `deploy/twenty-next/env/validation.env.example`

Contract-only Finance paths:

- `packages/twenty-apps/internal/mhoo-finance/package.json`
- `packages/twenty-apps/internal/mhoo-finance/.gitignore`
- `packages/twenty-apps/internal/mhoo-finance/yarn.lock`
- `packages/twenty-apps/internal/mhoo-finance/.nvmrc`
- `packages/twenty-apps/internal/mhoo-finance/.oxlintrc.json`
- `packages/twenty-apps/internal/mhoo-finance/.yarnrc.yml`
- `packages/twenty-apps/internal/mhoo-finance/tsconfig.json`
- `packages/twenty-apps/internal/mhoo-finance/tsconfig.spec.json`
- `packages/twenty-apps/internal/mhoo-finance/vitest.config.ts`
- `packages/twenty-apps/internal/mhoo-finance/README.md`
- `packages/twenty-apps/internal/mhoo-finance/PROVENANCE.md`
- `packages/twenty-apps/internal/mhoo-finance/src/engagement/authority-contract.ts`
- `packages/twenty-apps/internal/mhoo-finance/src/__tests__/authority-contract.test.ts`
- `packages/twenty-apps/internal/mhoo-finance/src/__tests__/authority-contract.visibility.type-test.ts`

These paths contain only a standalone contract evaluator and synthetic tests.
They are not an installable Twenty App and do not authorize application
metadata, Workspace mutation, provider access, credentials, customer data,
imports, deployment, or production activation.
