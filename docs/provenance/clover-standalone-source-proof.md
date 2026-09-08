# Standalone Clover first source phase

ARCHITECTURE IMPACT: CROSS-SYSTEM

Owner's 2026-09-07 standalone decision supersedes the Finance-owned binding.
Previous source preserved at `88691b1940c78ebb386db1faf16fcfe630ffc543`.
Native manualToken contract, encryption, App binding, membership, permission
intersection and disconnect are reused without widening credential access.
No account migration/relabel or live credentials are performed.

Implementation: `packages/twenty-apps/internal/mhoo-clover`.
`PRODUCT_REQUIREMENTS.md` records IDs, merchant-v1 record contract, permission,
missing-producer, retention and uninstall behavior. Finance-specific provider,
reader and credential-role declarations are removed; PR36 files are untouched.
New intake resolves the installed standalone Clover App instead of Finance.
The server's preexisting unbound-account guard remains, and no import is added.

## Proof

- Native `twenty dev:build` passes locally using pinned SDK dist/cli.cjs:
  manifest, function bundles and typecheck. No sync/install was run.
- App tsgo and App Oxlint pass.
- 38 focused native tests pass: intake/reader/disconnect 34, native cross-App
  object reference and role intersection 4. Synthetic repositories/cache/maps;
  no signed JWT, complete executor, HTTP authorization or App-install proof.
- 7 Clover App tests pass: manifest/object, observation projection and failure,
  actual handler + native REST client delegated token, missing-token denial.
  HTTP intercepted; no real provider or Workspace records created.
- The explicit-token producer check prevents native REST API-key fallback from
  turning a missing delegated session into an application-only record write.
- Earlier PostgreSQL tests are preserved with new binding constant but not
  rerun in this slice. The earlier PG receipt remains scoped to its own head.

The producer uses the native REST endpoint for the new object, with server-side
user + App permissions expected by native routing. Real installation/reference
resolution, endpoint execution and disconnect/uninstall persistence must still
be proven in an authorized isolated native runtime. Validator/permission-unit
proof alone is insufficient. No automatic dependency solver or cross-App
executor permission contract is invented.

There are no public/MCP/cron/workflow triggers. Merchant observations contain
no transaction amounts/currency/account mapping and are not finance evidence.
Native combined create/update permission means storage is not immutable/WORM.
Default-off same-origin session edits are preserved separately, unfinished.
Source completion does not enable a signup CTA or real credential intake.
