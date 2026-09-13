# MHO-255 startup acceptance

The manual `Clean foundation image` workflow builds the selected source SHA with
`APP_VERSION=<governed upstream version>+<full SHA>` and an independent OCI
source revision. A second hosted runner has only `contents: read` and
`packages: read`; it pulls the published digest and runs the disposable PG16
acceptance harness. Both server and worker use that digest. It does not deploy.

The harness creates unique Compose networks and volumes, publishes no ports,
uses generated disposable encryption/application keys, and always removes only
its own resources. It never loads the operator's `.env` or the pilot Compose file.

Run on an approved disposable Docker host with existing narrow registry access:

```sh
TWENTY_IMAGE=ghcr.io/mhoo-os/mhoo-twenty-next@sha256:<digest> \
EXPECTED_SOURCE_SHA=<40-character-source-sha> \
EXPECTED_APP_VERSION=2.37.0+<40-character-source-sha> \
bash deploy/twenty-next/mho255-verify.sh
```

The `work/mho255-evidence` packet includes image identity, PG version, migration
ledger, health, worker process checks, restart/preservation checks, interruption
failure logs and a synthetic pre-restart database dump. The dump is a rollback
input, not a claimed production restore rehearsal or authorization to downgrade
an existing database. MHO-240 owns final infrastructure acceptance and promotion
requires human review. Failed or missing evidence keeps acceptance incomplete.

Startup now rejects schema-only initialization and any missing frozen legacy
migration. Operators must investigate and explicitly complete or restore such a
database; startup performs no destructive automatic repair. Required setup SQL
errors and upgrade errors return nonzero before the server starts. The explicit
worker migration-disable setting remains supported.
