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
