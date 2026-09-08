# mhoo-twenty-next contributor entrypoint

This is the clean Twenty v2.37.0 distribution and the accepted native Finance
source repository. Start with [AGENTS.md](AGENTS.md) before running commands.
The upstream product examples below describe capabilities, not permission to
publish, install an App, access provider data, or operate a deployment.

## Ownership and source

- [ADR-0009, accepted Finance boundary](https://github.com/mhoo-os/mhoo/blob/abdc2be8a2adb6d979905db8bcf6a3ae6c41225c/ADR/0009-finance-six-year-forensic-review.md)
  assigns `@mhoo/finance` to this repository, at
  [packages/twenty-apps/internal/mhoo-finance](packages/twenty-apps/internal/mhoo-finance).
- That decision amends Finance only. [ADR-0008](https://github.com/mhoo-os/mhoo/blob/abdc2be8a2adb6d979905db8bcf6a3ae6c41225c/ADR/0008-twenty-framework-platform.md)
  retains its general App and `@mhoo/core` boundary; this README does not move
  those responsibilities here. The separate `core` repository preserves legacy
  evidence. Architecture decisions belong in `mhoo`; operations belong in
  `infrastructure`.
- [.twenty-source](.twenty-source) pins upstream identity. Preserve upstream
  ancestry and the [enumerated overlay](docs/provenance/clean-foundation-overlay.md).
  Never merge, cherry-pick, or import legacy `mhoo-twenty` commits.
- The [central generated context](https://github.com/mhoo-os/mhoo/blob/abdc2be8a2adb6d979905db8bcf6a3ae6c41225c/docs/architecture/REPOSITORY_CONTEXT.json)
  is owned by `mhoo`. Its catalog has no dedicated entry for this repository at
  the linked revision; use accepted ADR-0009 for Finance, and escalate catalog
  drift to that owner instead of broadening ownership locally.

## Commands: choose only the relevant check

Use Node matching root `package.json` (`^24.5.0`) and pinned Yarn 4.13.0.
Dependency setup is `yarn install --immutable` at the repository root. Finance
has its own package manifest and lockfile; install there separately when needed.
Commands below are source-defined examples, not checks run by this README.

| Purpose | Command from repository root |
| --- | --- |
| Source custody | `bash scripts/provenance/verify-source.sh HEAD` |
| Exact committed diff | `bash .agents/skills/pr-trajectory-audit/scripts/exact-head-fixture.sh <base-sha> <head-sha>` |
| Focused frontend test | `yarn nx run twenty-front:test --runTestsByPath <test-path> --runInBand` |
| Focused server test | `yarn nx run twenty-server:test:ci --runTestsByPath <test-path>` |
| Changed project types/build | `yarn nx run <project>:typecheck` / `yarn nx run <project>:build` |
| Finance unit checks | `yarn --cwd packages/twenty-apps/internal/mhoo-finance test:unit` |
| Finance lint/types | `yarn --cwd packages/twenty-apps/internal/mhoo-finance lint` / `yarn --cwd packages/twenty-apps/internal/mhoo-finance typecheck` |

Replace placeholders with actual project names and test paths. Host projects
include `twenty-front`, `twenty-server`, and `twenty-emails`; Finance uses its
package scripts. See [nx.json](nx.json), each project's `project.json`, and the
[Finance scripts](packages/twenty-apps/internal/mhoo-finance/package.json).
Nx checks can build dependencies; Finance typecheck runs `twenty dev:build`.
Do not repeat full builds or unchanged passing tests to refresh a status.
Local `yarn start` launches server, frontend and worker: use only with an
approved development environment, never as an onboarding probe.

## Existing work and evidence

Snapshot supplied by the coordinator on 2026-09-07; refresh exact heads and
existing issue/run-ledger receipts before acting. These are distinct lanes,
not instructions to resume them:

- [MHO-259](https://linear.app/mhoo/issue/MHO-259), [PR37](https://github.com/mhoo-os/mhoo-twenty-next/pull/37):
  shared AI/editor source complete at `b199aa05571a05c794d39e1964ce538023b26404`;
  hosted CI receipt records 69 successful / 42 skipped checks, none failed or
  pending. Open draft; no merge or deployment approval. Reuse the MHO-259 run ledger.
- [MHO-240](https://linear.app/mhoo/issue/MHO-240), [PR28](https://github.com/mhoo-os/mhoo-twenty-next/pull/28):
  combined-release hold. Its later frontend route-count failure is already
  corrected in PR37's separate source lane; do not duplicate that repair or
  call PR28 fully green from its older receipt.
- [MHO-265](https://linear.app/mhoo/issue/MHO-265) /
  [MHO-266](https://linear.app/mhoo/issue/MHO-266), [PR32](https://github.com/mhoo-os/mhoo-twenty-next/pull/32):
  existing bounded Clover source lane; retain its owner and grant/lifecycle
  boundaries. No provider credentials or production activation follow from setup.
- [MHO-146](https://linear.app/mhoo/issue/MHO-146), [PR36](https://github.com/mhoo-os/mhoo-twenty-next/pull/36):
  installed Finance receipt is separate from source readiness. Coordinator
  reports zero post-apply diff and 20 saved facts preserved; restricted-user
  denial remains unproved. Do not redo accepted journeys or seed cleanup.

Issue status, source checks, review, installation and runtime/recovery acceptance
must retain separate evidence. Follow the existing coordinator's scoped handoff;
a new repository head or project label does not transfer worker custody.

---

<p align="center">
  <a href="https://github.com/mhoo-os/mhoo-twenty-next">
    <img src="./packages/twenty-front/public/images/mhoo/mhoo-snout-transparent-1024.png" width="100px" alt="Mhoo pig snout mark" />
  </a>
</p>

<h2 align="center">Mhoo — a governed distribution built on Twenty</h2>

<p align="center"><a href="https://github.com/mhoo-os/mhoo-twenty-next"><img src="./packages/twenty-website/public/images/readme/code-icon.svg" width="12" height="12"/> Mhoo source</a> · <a href="./packages/twenty-docker/helm/twenty/README.md"><img src="./packages/twenty-website/public/images/readme/rocket-icon.svg" width="12" height="12"/> Operator guide</a> · <a href="https://docs.twenty.com"><img src="./packages/twenty-website/public/images/readme/book-icon.svg" width="12" height="12"/> Upstream Twenty docs</a> · <a href="./docs/provenance/distribution-display-ledger.md"><img src="./packages/twenty-website/public/images/readme/map-icon.svg" width="12" height="12"/> Distribution ledger</a></p>

<br />

# Why Mhoo

Mhoo is the governed product distribution built on a clean Twenty foundation.
It keeps the upstream application framework, technical contracts, and upgrade
identity intact while giving customer-facing and operator-facing surfaces one
reviewed Mhoo presentation.

The source overlay is recorded in the [distribution display ledger](./docs/provenance/distribution-display-ledger.md). Legal publication, disposable
runtime proof, and release selection remain downstream gates.

<br />

# Installation

### <img src="./packages/twenty-website/public/images/readme/rocket-icon.svg" width="14" height="14"/> Source-compatible self-hosting

Use the governed Docker Compose source path while developing or preparing a
release:

```bash
cp packages/twenty-docker/.env.example .env
# Set SERVER_URL, PRODUCT_BRAND_DEPLOYMENT_ORIGIN, and the required secrets.
docker compose --env-file .env -f packages/twenty-docker/docker-compose.yml up -d
```

`PRODUCT_BRAND_PRESET=mhoo` is the distribution default. The deployment origin
must be the same `http(s)` origin as `SERVER_URL`, without a path or query.
This source path does not by itself claim public release or production proof.

### <img src="./packages/twenty-website/public/images/readme/book-icon.svg" width="14" height="14"/> Build an app

The app-development commands and package names intentionally retain their
technical Twenty identity:

```bash
npx create-twenty-app my-app
```

Define objects, fields, and views as code:

```ts
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  nameSingular: 'deal',
  namePlural: 'deals',
  labelSingular: 'Deal',
  labelPlural: 'Deals',
  fields: [
    { name: 'name', label: 'Name', type: FieldType.TEXT },
    { name: 'amount', label: 'Amount', type: FieldType.CURRENCY },
    { name: 'closeDate', label: 'Close Date', type: FieldType.DATE_TIME },
  ],
});
```

Then ship it to your workspace:

```bash
npx twenty app:publish --private
```

See the [upstream Twenty app development guide](https://docs.twenty.com/developers/extend/apps/getting-started) for objects, views, agents, and logic functions.

### <img src="./packages/twenty-website/public/images/readme/book-icon.svg" width="14" height="14"/> Technical reference

For retained upstream framework behavior, consult the [upstream Twenty
Docker Compose guide](https://docs.twenty.com/developers/self-host/capabilities/docker-compose)
and [local setup guide](https://docs.twenty.com/developers/contribute/capabilities/local-setup).

<br />
<br />

# Upstream Twenty capabilities retained by this distribution

The inherited application surface provides the CRM building blocks, objects,
views, workflows, agents, and app extension points. The sections below retain
upstream technical examples; they are not separate Mhoo product claims.

Read the <a href="https://docs.twenty.com/user-guide/introduction"><img src="./packages/twenty-website/public/images/readme/planner-icon.svg" width="14" height="14"/> Upstream Twenty user guide</a> for product walkthroughs, or the <a href="https://docs.twenty.com"><img src="./packages/twenty-website/public/images/readme/book-icon.svg" width="14" height="14"/> Upstream Twenty documentation</a> for developer reference.

<table align="center">
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./packages/twenty-website/public/images/readme/v2-build-apps-dark.webp" />
        <source media="(prefers-color-scheme: light)" srcset="./packages/twenty-website/public/images/readme/v2-build-apps-light.webp" />
        <img src="./packages/twenty-website/public/images/readme/v2-build-apps-light.webp" alt="Create your apps" />
      </picture>
      <p align="center"><a href="https://docs.twenty.com/developers/extend/apps/getting-started"><img src="./packages/twenty-website/public/images/readme/code-icon.svg" width="16" height="16"/> Learn more about apps in doc</a></p>
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./packages/twenty-website/public/images/readme/v2-version-control-dark.webp" />
        <source media="(prefers-color-scheme: light)" srcset="./packages/twenty-website/public/images/readme/v2-version-control-light.webp" />
        <img src="./packages/twenty-website/public/images/readme/v2-version-control-light.webp" alt="Stay on top with version control" />
      </picture>
      <p align="center"><a href="https://docs.twenty.com/developers/extend/apps/publishing"><img src="./packages/twenty-website/public/images/readme/monitor-icon.svg" width="16" height="16"/> Learn more about version control in doc</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./packages/twenty-website/public/images/readme/v2-all-tools-dark.webp" />
        <source media="(prefers-color-scheme: light)" srcset="./packages/twenty-website/public/images/readme/v2-all-tools-light.webp" />
        <img src="./packages/twenty-website/public/images/readme/v2-all-tools-light.webp" alt="All the tools you need to build anything" />
      </picture>
      <p align="center"><a href="https://docs.twenty.com/developers/extend/apps/building"><img src="./packages/twenty-website/public/images/readme/rocket-icon.svg" width="16" height="16"/> Learn more about primitives in doc</a></p>
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./packages/twenty-website/public/images/readme/v2-tools-dark.webp" />
        <source media="(prefers-color-scheme: light)" srcset="./packages/twenty-website/public/images/readme/v2-tools-light.webp" />
        <img src="./packages/twenty-website/public/images/readme/v2-tools-light.webp" alt="Customize your layouts" />
      </picture>
      <p align="center"><a href="https://docs.twenty.com/user-guide/layout/overview"><img src="./packages/twenty-website/public/images/readme/planner-icon.svg" width="16" height="16"/> Learn more about layouts in doc</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./packages/twenty-website/public/images/readme/v2-ai-agents-dark.webp" />
        <source media="(prefers-color-scheme: light)" srcset="./packages/twenty-website/public/images/readme/v2-ai-agents-light.webp" />
        <img src="./packages/twenty-website/public/images/readme/v2-ai-agents-light.webp" alt="AI agents and chats" />
      </picture>
      <p align="center"><a href="https://docs.twenty.com/user-guide/ai/overview"><img src="./packages/twenty-website/public/images/readme/message-icon.svg" width="16" height="16"/> Learn more about AI in doc</a></p>
    </td>
    <td width="50%">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./packages/twenty-website/public/images/readme/v2-crm-tools-dark.webp" />
        <source media="(prefers-color-scheme: light)" srcset="./packages/twenty-website/public/images/readme/v2-crm-tools-light.webp" />
        <img src="./packages/twenty-website/public/images/readme/v2-crm-tools-light.webp" alt="Plus all the tools of a good CRM" />
      </picture>
      <p align="center"><a href="https://docs.twenty.com/user-guide/introduction"><img src="./packages/twenty-website/public/images/readme/star-icon.svg" width="16" height="16"/> Learn more about CRM features in doc</a></p>
    </td>
  </tr>
</table>

<br />

# Stack

- <a href="https://www.typescriptlang.org/"><img src="./packages/twenty-website/public/images/readme/stack-typescript.svg" width="14" height="14"/> TypeScript</a>
- <a href="https://nx.dev/"><img src="./packages/twenty-website/public/images/readme/stack-nx.svg" width="14" height="14"/> Nx</a>
- <a href="https://nestjs.com/"><img src="./packages/twenty-website/public/images/readme/stack-nestjs.svg" width="14" height="14"/> NestJS</a>, with <a href="https://bullmq.io/">BullMQ</a>, <a href="https://www.postgresql.org/"><img src="./packages/twenty-website/public/images/readme/stack-postgresql.svg" width="14" height="14"/> PostgreSQL</a>, <a href="https://redis.io/"><img src="./packages/twenty-website/public/images/readme/stack-redis.svg" width="14" height="14"/> Redis</a>
- <a href="https://reactjs.org/"><img src="./packages/twenty-website/public/images/readme/stack-react.svg" width="14" height="14"/> React</a>, with <a href="https://jotai.org/">Jotai</a>, <a href="https://linaria.dev/">Linaria</a> and <a href="https://lingui.dev/">Lingui</a>

# Thanks

<p align="center">
  <a href="https://greptile.com"><img src="./packages/twenty-website/public/images/readme/greptile.webp" height="28" alt="Greptile" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://sentry.io/"><img src="./packages/twenty-website/public/images/readme/sentry.webp" height="28" alt="Sentry" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://crowdin.com/"><img src="./packages/twenty-website/public/images/readme/crowdin.webp" height="28" alt="Crowdin" /></a>
</p>

Thanks to these amazing services that we use and recommend for code review (Greptile), catching bugs (Sentry) and translating (Crowdin).

# Join the upstream Twenty community

<p><a href="https://github.com/twentyhq/twenty"><img src="./packages/twenty-website/public/images/readme/star-icon.svg" width="12" height="12"/> Star the repo</a> · <a href="https://discord.gg/cx5n4Jzs57"><img src="./packages/twenty-website/public/images/readme/discord-icon.svg" width="12" height="12"/> Discord</a> · <a href="https://github.com/twentyhq/twenty/discussions"><img src="./packages/twenty-website/public/images/readme/message-icon.svg" width="12" height="12"/> Feature requests</a> · <a href="https://github.com/orgs/twentyhq/projects/1/views/35"><img src="./packages/twenty-website/public/images/readme/rocket-icon.svg" width="12" height="12"/> Releases</a> · <a href="https://twitter.com/twentycrm"><img src="./packages/twenty-website/public/images/readme/x-icon.svg" width="12" height="12"/> X</a> · <a href="https://www.linkedin.com/company/twenty/"><img src="./packages/twenty-website/public/images/readme/linkedin-icon.svg" width="12" height="12"/> LinkedIn</a> · <a href="https://twenty.crowdin.com/twenty"><img src="./packages/twenty-website/public/images/readme/language-icon.svg" width="12" height="12"/> Crowdin</a> · <a href="https://github.com/twentyhq/twenty/contribute"><img src="./packages/twenty-website/public/images/readme/code-icon.svg" width="12" height="12"/> Contribute</a></p>
