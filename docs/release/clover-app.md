# Clover App Release Flow

The release flow is repository-owned. A Codex skill may explain how to operate
it, but the target list, credentials boundary, and automation live here so CI
and humans use the same source of truth.

## Files

- `ops/clover/release-targets.json` lists approved Twenty remotes. It contains
  URLs and secret environment names only; never put API keys in this file.
- `scripts/release-clover-app.sh` authenticates each target, publishes the
  version to the target server's private registry, and installs it on every
  target in order.
- `.github/workflows/release-clover-app.yaml` runs the script for an explicit
  `clover-v<semver>` tag or a manually selected ref.

## Setup

Create one GitHub Actions secret for every `apiKeyEnv` in the target manifest.
The key must be able to publish and install Apps on that target server. Keep
the secret in the repository or environment secret store; never commit a CLI
config file or token.

If multiple workspaces share one Twenty server, set `publish: true` for only
one target on that server and `publish: false` for the other workspaces. If a
workspace is on another server, add a target with `publish: true` for that
server.

## Release

1. Bump `packages/twenty-apps/internal/mhoo-clover/package.json` to a new
   semver version.
2. Run the App tests, typecheck, lint, and build locally.
3. Push a matching tag, for example `clover-v0.1.5`.
4. The workflow publishes once per marked server and installs the version on
   every configured target.
5. Run the Hass Kitchen MCP merchant read and one bounded Clover data read as
   post-release smoke tests.

Use `workflow_dispatch` with `dry_run=true` to validate the manifest and secret
names without changing any server.

## Rollback

Do not reinstall an older version number. Revert the source, bump the App
version, and release a new higher patch version so Twenty's upgrade ordering
remains monotonic.
