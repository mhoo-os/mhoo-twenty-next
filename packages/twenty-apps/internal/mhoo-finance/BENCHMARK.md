# MHO-124 synthetic population preparation

This is an offline input generator for the six-year storage benchmark, not the
storage benchmark verdict. It reuses Finance `SourceArtifact` and `SourceRow`
types. No database, runtime connector, dashboard data model or dependency is
added. The two new code paths are a **WRAP** of existing fixture contracts.

From this package, with Node 24:

```sh
yarn benchmark:population 50000 /tmp/mhoo-finance-population-a 1000
yarn benchmark:population 50000 /tmp/mhoo-finance-population-b 1000
cmp /tmp/mhoo-finance-population-a/manifest.json /tmp/mhoo-finance-population-b/manifest.json
```

Both output directories must be absent. Existing directories are rejected;
the generator never overwrites originals. Choose new directories for reruns.
The example assumes 50,000 six-year events solely to demonstrate the harness.
It produces 100,000 distinct events, 20,000 duplicate rows and 10,000 correction
rows, distributed over 72 synthetic months. These are not Hass source counts
or accepted engagement dates. For populations below 72 events, not every month
will contain a row.

Each JSONL artifact retains physical row numbers and SHA-256. Duplicate rows
have distinct physical locations but the same event and revision. Corrections
retain revision one and add revision two with a one-cent change. Manifest
control totals use only the latest revision of each unique event. Artifacts
are multi-period synthetic exports: their period is the explicit six-year range,
while each source row has its exact month. They are benchmark raw inputs, not
monthly statement controls or already-installed native records.

The generator keeps only one chunk of rows in memory. Chunk size limits unique
events; raw rows can be up to twice that size due to duplicates and corrections.
The manifest is written only after every artifact succeeds. An interrupted
directory without its manifest is incomplete. `generateSyntheticPopulation`
can reproduce a suffix from an exact `nextEvent` boundary under identical
options; the CLI deliberately rebuilds into a new directory instead of trusting
an unverified partial output. There is no persisted ingestion checkpoint or
coverage/snapshot advancement here.

## Evidence still required before the storage decision

- Authorized source capability counts and a documented six-year projection;
  rerun at at least twice that measured projection. Every current manifest
  deliberately labels its input `HYPOTHETICAL_NOT_MEASURED`.
- Native Twenty object ingestion and generated-client query workloads, with
  an index inventory within the ten-index limit per object.
- Measured trace/exception P95 at most two seconds, coverage P95 at most five
  seconds, and background chunks below 900 seconds under concurrency.
- Native commit/checkpoint failure and retry proof, upgrade, backup/restore,
  raw-evidence rebuild and snapshot/coverage non-advancement on failed chunks.
- Query plans, storage growth, write amplification, tuning and signed verdict.

Local generation timing and byte-identical regeneration prove fixture
preparation only. They do not establish any native SLO, backup recovery,
customer-workspace availability or permission to import real data.
