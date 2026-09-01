# Mhoo Helm distribution (built on Twenty)

Deploy the Mhoo distribution on Kubernetes with the existing Twenty server,
worker, PostgreSQL, and Redis components. The chart name, release examples,
resource names, and technical package paths remain `twenty` for compatibility.

## Features
- Server and worker deployments with product brand settings and full env exposure via `values.yaml`.
- Internal PostgreSQL (Spilo) and Redis deployments included.
- PVC-based persistence using dynamic storage classes (no static PV manifests).
- Ingress with configurable annotations, hosts, and TLS.
- Database readiness and migrations handled by server/worker init containers by default.
– Standard Kubernetes Jobs for DB creation/user and migrations have been removed to simplify installs. Readiness and migrations run in init containers.

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a simple 2-line install with your domain.

## Installing

**Prerequisites:** Kubernetes 1.21+, Helm 3.8+, default StorageClass

Internal DB + Redis (default):
```bash
helm install my-twenty ./packages/twenty-docker/helm/twenty \
  --namespace twentycrm --create-namespace
```

The chart defaults to the reviewed Mhoo product preset. Set
`brand.deploymentOrigin` when the public origin cannot be derived from the
ingress configuration:

```bash
helm install my-twenty ./packages/twenty-docker/helm/twenty \
  --namespace twentycrm --create-namespace \
  --set brand.preset=mhoo \
  --set brand.deploymentOrigin=https://crm.example.com
```

External DB/Redis:
```bash
helm install my-twenty ./packages/twenty-docker/helm/twenty \
  --namespace twentycrm --create-namespace \
  --set db.enabled=false \
  --set db.external.host=db.example.com \
  --set redisInternal.enabled=false
```

## Key Values

See `values.yaml` for a comprehensive list.

- `brand.preset`: `mhoo` by default; `twenty` is reserved for an explicit upstream-compatibility fixture.
- `brand.deploymentOrigin`: an `http(s)` origin without a path, query, or fragment. If empty, the chart derives it from `SERVER_URL` or ingress.
- `image.repository` and `image.tag`: the image is an explicit release input. Existing upstream `twentycrm/twenty` defaults are retained until a reviewed Mhoo release artifact is selected.

## Notes

- Database URL and Redis URL are composed automatically from chart settings
- Database `twenty` and schema `core` are created automatically by server init container
- Kubernetes resource names, selectors, PVC names, and migration behavior retain their technical Twenty identity for upgrade compatibility.
- No optional jobs: the chart no longer provides separate Jobs for DB or migrations.
- Access token auto-generated (32 chars) if not provided; reuses existing secret if present
  - For production, provide a strong `secrets.tokens.accessToken` value via a secure values file; the auto-generated token is a convenience fallback.
- TLS enabled by default via cert-manager (`acme: true`)
- Requires default StorageClass for PVC provisioning
## Testing

```bash
helm lint ./packages/twenty-docker/helm/twenty
helm template my-twenty ./packages/twenty-docker/helm/twenty
helm plugin install https://github.com/quintush/helm-unittest
helm unittest ./packages/twenty-docker/helm/twenty
```

## Storage

**Local (default):** Uses PVCs for persistence

**S3:** Set `storage.type=s3` and provide credentials using a values file. You can either pass credentials directly or reference an existing Kubernetes Secret.
```bash
# values-secrets.yaml (do not commit)
# storage:
#   type: s3
#   s3:
#     bucket: my-bucket
#     region: us-east-1
#     # Option A: direct values
#     accessKeyId: AKIA...
#     secretAccessKey: ...
#     # Option B: reference a Secret
#     # secretName: my-s3-creds
#     # accessKeyIdKey: accessKeyId
#     # secretAccessKeyKey: secretAccessKey

helm install my-twenty ./packages/twenty-docker/helm/twenty -f values-secrets.yaml
```

## Production Tips

- **Image versioning:** The chart defaults to `Chart.yaml`'s `appVersion` (currently v1.14.0). Override via `image.tag` in values to pin a different version or use `latest` for rolling updates.
- **Mhoo release input:** Before a release, set `image.repository` and `image.tag` to the reviewed Mhoo-built artifact. Source work does not invent or retag an immutable release digest.
- **Product origin:** Keep `brand.deploymentOrigin` aligned with the public `SERVER_URL` origin so relative Mhoo assets and links resolve safely.
- **Keep secrets secure:** Avoid `--set` for sensitive values; use `-f values-secrets.yaml` or reference existing Kubernetes Secrets via `server.extraEnvFrom`.
  - S3 credentials can be referenced via `storage.s3.secretName + accessKeyIdKey/secretAccessKeyKey` to avoid embedding them in pod specs.
