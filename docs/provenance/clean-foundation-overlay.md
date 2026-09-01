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

Rebrand source paths authorized by the accepted MHO-153 contract:

- `packages/twenty-front/public/images/mhoo/`
- `packages/twenty-shared/src/branding/`
- `packages/twenty-shared/package.json`
- `packages/twenty-shared/project.json`
- `scripts/generate_mhoo_assets.py`
- `scripts/verify_mhoo_assets.py`
- `packages/twenty-server/.env.example`
- `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`
- `packages/twenty-server/src/engine/core-modules/twenty-config/twenty-config.module.ts`
- `packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver.service.ts`
- `packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver.service.spec.ts`

Workspace presentation policy paths:

- `packages/twenty-shared/src/branding/workspace-presentation.ts`
- `packages/twenty-shared/src/branding/__tests__/brand-presets.test.ts`
- `packages/twenty-server/src/engine/core-modules/workspace/workspace.resolver.ts`
- `docs/provenance/workspace-presentation-policy.md`

These paths authorize source-level branding work only. They do not authorize
runtime deployment, publication, legal approval, or production mutation.
