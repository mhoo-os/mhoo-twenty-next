# Clover isolated native development proof

ARCHITECTURE IMPACT: CROSS-SYSTEM

2026-09-07, provider source `cb1cf7918073f244ef85cad1fba00979ebf81240`.
This supersedes the missing native integration boundary in the first source
receipt only for the cases below. No production or real Clover account was used.

Four integration cases pass in `clover-native-data.integration-spec.ts`:

1. A consumer object reference fails native metadata validation before Clover
   exists. No substitute object is created.
2. The actual built Clover manifest and source/built function files upload and
   synchronize through native development-App APIs. The consumer role then
   references the installed Clover-owned object successfully.
3. Native signed delegated tokens: Clover writes a merchant observation through
   REST; a separate consumer reads it. Consumer write is denied with the native
   permission error (HTTP400), and unauthenticated read is denied (HTTP403).
4. Real HTTP intake stores a synthetic credential through native custody.
   Clover can resolve its account; the consumer cannot. Native disconnect
   removes it. The real LOCAL function executor and SDK reject a read after
   disconnect with the expected Clover-unavailable error.

Only external Clover HTTP in intake is stubbed, and the intake enablement config
is scoped to the seeded synthetic Workspace during that case. JWT verification,
App token generation, native metadata sync, memberships, permissions, database,
REST routing, account access, disconnect and LOCAL executor are actual native
boundaries. Successful provider execution in the child executor is not proven;
the executor proof is a denial after disconnect. No public trigger was added.
The consumer is a synthetic App, not the Finance App or a live installation.

## Reproduction and custody

Dedicated `postgres:16` localhost55441 database `clover_native_synthetic` and
`redis:7` localhost56391; native setup-db, run-instance-commands --force
--include-slow, and workspace:seed:dev created the complete native schema and
two synthetic Workspaces. The suite refuses another database URL. Local test
configuration disabled Sentry, telemetry and billing, used LOGGER email and
isolated storage. The original .env.test was restored byte-for-byte afterward.
Only the two named proof containers/volumes were removed; existing containers
were left running. No reset/truncate command targeted another database.

Build the Clover App using pinned `twenty-sdk/dist/cli.cjs dev:build`, build the
native server and its normal client SDK assets. From twenty-server run:
`NODE_ENV=test NODE_OPTIONS=--max-old-space-size=6144 ../../node_modules/.bin/jest
--config jest-integration.config.ts --runInBand --runTestsByPath
test/integration/metadata/suites/application/clover-native-data.integration-spec.ts`.
The local logs are `/tmp/clover-native-integration.log` and native setup,
migration and seed logs under `/tmp/clover-native-*.log`.

Not proven: catalog packaging/install/upgrade, provider success in the executor,
a financial consumer, historical/incremental ingestion, provider scopes,
credential recovery/rotation, provider-side revocation, production or live signup.
