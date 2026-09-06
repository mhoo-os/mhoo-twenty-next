# Front component same-origin edge authentication

ARCHITECTURE IMPACT: LOCAL

MHO-259, owner-authorized targeted diagnosis and source repair, September 7, 2026. Based on main `317acc8792c6c2f3f9e9ea2c137775f894e25f11` and exact
Twenty v2.37 ancestry. This is a generally applicable same-origin reverse-proxy
compatibility fix, with no Cloudflare-specific credential handling in source.

## Confirmed failure

The live Finance component request failed with `net::ERR_FAILED`. A bounded
read-only matrix against that exact content-addressed endpoint returned:

| Credentials                      | Live response                    |
| -------------------------------- | -------------------------------- |
| None                             | 302 to Cloudflare Access         |
| Twenty API authorization only    | 302 to Cloudflare Access         |
| Existing Cloudflare session only | 403 from Twenty                  |
| Both existing credentials        | 200, JavaScript, 1,081,984 bytes |

The loader explicitly used `credentials: omit`. The patch uses `same-origin`
for host-owned component and SDK code fetches. The browser decides origin
matching. Cross-origin credentials are not enabled. Presigned storage handoffs
remain header-less with credentials omitted; App-requested host fetch policy,
sandbox isolation, and Twenty Workspace authentication remain unchanged.

## Verification

- Renderer Jest: 107 suites, 643 tests passed (including fetch-policy tests).
- Renderer `tsconfig.lib.json` typecheck passed.
- Source custody and diff whitespace checks passed.
- Browser exercised bundled changed source against two loopback origins:
  unauthenticated component/SDK requests rejected; authenticated requests
  loaded; cross-origin component/SDK requests, storage handoff and HTTP redirect
  target received neither cookie nor Authorization header.
- Reproduce the browser check from repository root with
  `node scripts/provenance/front-component-cookie-browser.cjs`, open the printed
  localhost URL and click Run checks. Only synthetic credentials are used.
  Stop the process afterward. Ports 8797/8798 bind to loopback only.

Local tests used existing installed dependencies from a separate worktree; they
are not a fresh immutable install or a complete production image build.

## Release and data limits

No production image was changed. This source result is not deployed-dashboard
proof. Deploy through the existing governed release path, retaining the prior
image digest for rollback, then verify actual authenticated dashboard loading
and unauthenticated denial. No Access bypass or cookie forwarding to an
unrelated origin is part of the proposal.

The 20 saved CSV sample facts were preserved. The currently installed Finance
landing component is a preparation/synthetic-preview surface; this loader fix
does not add saved-record reads. Native Finance facts already displays the
sample. A live sample dashboard and any required App read permission need their
own bounded integration and installed verification; do not infer those from a
successful bundle load.
