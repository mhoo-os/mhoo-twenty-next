# Synthetic shared status trial

Both adapters import `../src/operator/PaymentStatus` and its typed read-only
status contract. The Twenty adapter uses the real SDK definition validator;
its **named export** is deliberately excluded from App manifest discovery.
It is mounted in ordinary React DOM, not Twenty Remote DOM. This is not an
installed settings page or native permission/invocation proof.

From repository root with existing dependencies and the repository SDK available:

```
node packages/twenty-apps/internal/mhoo-clover/harness/verify.mjs /tmp/clover-status-proof
```

The script bundles only this harness, asserts shared import identity, binds
loopback ports 4332/4333, launches an isolated headless Chrome context, blocks
external browser requests and verifies selection/status/mobile interactions.
It writes screenshots, a module inventory and a timestamped receipt to the
explicit output directory, then closes its browsers and servers. Occupied
ports fail; it never stops another process. Chrome must already be installed.

All responses are injected fixtures. No provider requests, credentials, native
records, queue dispatch, new backend, install or deployment. Browser query
parameters choose a harness label only and carry no authority. A real adapter
must independently resolve native user/App/Workspace permission before access.

## Actual local Remote DOM case

This follow-up uses the source `FrontComponentRenderer`, its sandbox iframe and
worker, and the SDK's normal remote JSX/CSS build plugins. It does not install an
App. With the existing repository dependencies/SDK/UI builds available, run from
repository root:

```
node_modules/.bin/tsx packages/twenty-front-component-renderer/scripts/front-component-sandbox/build-sandbox-document.ts
node packages/twenty-apps/internal/mhoo-clover/harness/verify-remote.mjs /tmp/clover-remote-proof
```

The first command generates the ignored sandbox document in an isolated
checkout. Preserve any pre-existing file; remove only a file this run created
when finished. The second binds only loopback 4332, refuses non-local requests,
and closes its browser/server. `remote-host.jsx` is a JavaScript browser fixture
so the App compiler does not typecheck the host package through its different
path aliases. Its actual renderer imports are bundled and exercised, not mocked.
`remote-fixture.tsx` uses the worker module's render-container ABI and shares the
unchanged PaymentStatus. Neither file declares an installable App definition.
