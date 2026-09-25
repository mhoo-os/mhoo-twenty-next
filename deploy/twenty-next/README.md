# MHO-183 disposable closed-beta rehearsal

This directory is a bounded validation runtime for MHO-183. It is not a
production recipe and it must stop before DNS, public ingress, customer data,
Finance imports, or a final production cutover.

The candidate is the clean Twenty v2.37.0 foundation. The runtime enables only
password authentication, email verification, one manually activated
workspace, invitation-based membership, local Files storage, SMTP to an
isolated Mailpit sink, the Twenty server, and one Twenty queue worker. Google,
Microsoft, SSO, open signup after bootstrap, public invite links, workspace
discovery, logic functions, code interpreter, customer/provider credentials,
and broad anonymous APIs remain disabled or denied.

## State boundaries

- Source: `.twenty-source` and `scripts/provenance/verify-source.sh` prove the
  upstream commit/tree and lockfile/Dockerfile custody.
- CI: `mho183-contract.sh --static` proves the checked-in shape and dependency
  pins. It intentionally accepts only the documented candidate placeholder.
- Immutable candidate: the separately authorized Mhoo GHCR OCI image addressed
  by `ghcr.io/mhoo-os/mhoo-twenty-next@sha256:<64 hex>`. A tag is not a
  candidate digest.
- Bounded runtime: `compose.yaml` binds only loopback ports and private
  service networking; use a unique `MHO183_VOLUME_SUFFIX` for every rehearsal.
- Behavioral proof: `mho183-closed-beta-smoke.mjs` creates only random
  `mho183.invalid` identities and proves auth, invitation, role denial,
  workspace settings, Files upload/download, email, refresh, logout, reset,
  and revocation.
- Recovery: `mho183-backup.sh`, `mho183-restore-drill.sh`,
  `mho183-recreate.sh`, and `mho183-rollback.sh` write local receipts. They
  never claim off-host backup custody or a database schema downgrade.
- Authorization/production: owner authorization for the exact image,
  capabilities, workspace, URL, window, observation period, rollback target,
  legal packet, and release gates is still required. This directory performs
  no production mutation.

## Disposable rehearsal

Copy `env/validation.env.example` to a new file outside Git, replace the
candidate digest and synthetic secrets, set a unique volume suffix, and make
the file mode `0600`. Keep passwords and encryption keys out of shell history,
logs, receipts, and Git. Use a random alphanumeric Postgres password and a new
Twenty encryption key for each disposable stack.

Run the checked-in gates from the repository root:

```sh
scripts/release/mho183-contract.sh --static
scripts/release/mho183-contract.sh \
  --env-file /secure/path/mho183-validation.env \
  --project-name mho183-validation \
  --evidence-dir /secure/path/mho183-evidence

scripts/release/mho183-start.sh \
  --env-file /secure/path/mho183-validation.env \
  --project-name mho183-validation \
  --base-url http://127.0.0.1:3101 \
  --mailpit-url http://127.0.0.1:8026 \
  --evidence-dir /secure/path/mho183-evidence

MHO183_BASE_URL=http://127.0.0.1:3101 \
MHO183_MAILPIT_URL=http://127.0.0.1:8026 \
MHO183_EVIDENCE_DIR=/secure/path/mho183-evidence \
MHO183_CANDIDATE_IMAGE=ghcr.io/mhoo-os/mhoo-twenty-next@sha256:<candidate-digest> \
node scripts/release/mho183-closed-beta-smoke.mjs

scripts/release/mho183-backup.sh \
  --env-file /secure/path/mho183-validation.env \
  --project-name mho183-validation \
  --evidence-dir /secure/path/mho183-evidence

scripts/release/mho183-restore-drill.sh \
  --env-file /secure/path/mho183-validation.env \
  --project-name mho183-validation \
  --backup-file /secure/path/mho183-evidence/<backup-file>.dump \
  --files-backup /secure/path/mho183-evidence/<files-backup>.tar.gz \
  --redis-backup /secure/path/mho183-evidence/<redis-backup>.tar.gz \
  --evidence-dir /secure/path/mho183-evidence

scripts/release/mho183-recreate.sh \
  --env-file /secure/path/mho183-validation.env \
  --project-name mho183-validation \
  --candidate-image ghcr.io/mhoo-os/mhoo-twenty-next@sha256:<candidate-digest> \
  --base-url http://127.0.0.1:3101 \
  --mailpit-url http://127.0.0.1:8026 \
  --evidence-dir /secure/path/mho183-evidence
```

The backup gate captures the Postgres custom dump plus the Redis and Files
volumes. Redis is retained for queue/cache continuity during this rehearsal;
the application database remains the authoritative record.

The startup gate must show the server entrypoint's successful migration and
background-job registration markers, and the monitor receipt must show healthy
DB, Redis, server, worker, Mailpit, `/healthz`, and Mailpit API checks. To
exercise alerting, stop only the synthetic worker, run the monitor and retain
its expected non-zero alert receipt, then start the worker and require a fresh
healthy receipt.

Do not expose these loopback endpoints through a tunnel or reverse proxy during
the rehearsal. A real rollout window must separately specify public URL/TLS,
egress/SMTP policy, external alert routing, and a maximum observation period;
none is authorized by this validation recipe.

## Rollback contract

Rollback is an in-place disposable-stack recreation of only the server and
worker. It preserves DB/Redis/Files volumes, requires an exact prior image and
the hash of its redacted resolved configuration, and refuses to downgrade the
schema or remove data. The exact command is:

```sh
scripts/release/mho183-rollback.sh \
  --env-file /secure/path/mho183-validation.env \
  --project-name mho183-validation \
  --candidate-image ghcr.io/mhoo-os/mhoo-twenty-next@sha256:<candidate-digest> \
  --prior-image ghcr.io/mhoo-os/mhoo-twenty-next@sha256:<prior-good-digest> \
  --prior-config-sha256 <64-hex-redacted-compose-config-hash> \
  --allow-schema-compatible \
  --base-url http://127.0.0.1:3101 \
  --mailpit-url http://127.0.0.1:8026 \
  --evidence-dir /secure/path/mho183-evidence
```

Do not edit environment files during an incident. After the rollback receipt
and smoke/monitor checks, a validation operator may re-run Compose with the
candidate digest to leave the disposable rehearsal on the intended candidate.

## Deliberate limits

The clean foundation has no Mhoo brand/legal/Finance overlay in this
candidate. Cross-workspace native readback is not fabricated: the candidate is
explicitly single-workspace, so the proof rejects unknown workspace IDs,
invite hashes, anonymous access, ordinary-member admin actions, and revoked
membership. It proves that an allowed origin receives a browser session cookie
and a wrong origin does not; Twenty still returns token pairs to scripted
wrong-origin exchanges by design. A true multi-workspace test remains a gate. The
MHO-226 legal receipt, exact Finance revisions, signed SBOM/provenance, public
TLS/URL, external alert sink, offsite encrypted backup, restore/recreate in
the real hosting boundary, and final owner cutover authorization must be
present before any production decision.
