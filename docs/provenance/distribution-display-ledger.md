# Distribution, operator, and developer display ledger

This ledger scopes MHO-179 against the clean Twenty v2.37 foundation. It
records the source-only distribution overlay, the generic brand configuration
path, and the Twenty identities that remain intentionally unchanged.

## Source and authority

- Foundation tag: `twenty/v2.37.0`
- Foundation commit: `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`
- Foundation tree: `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`
- Product presentation authority: the reviewed `PRODUCT_BRAND_PRESET` and
  `PRODUCT_BRAND_DEPLOYMENT_ORIGIN` inputs resolved by
  `ProductBrandResolverService`
- Distribution default: `PRODUCT_BRAND_PRESET=mhoo`
- Origin rule: `PRODUCT_BRAND_DEPLOYMENT_ORIGIN` is an `http(s)` origin without
  credentials, a path, a query, or a fragment; relative Mhoo links and assets
  resolve against it
- Release authority: MHO-181 remains the human legal/publication gate and
  MHO-183 remains the final disposable-runtime, release, and recovery proof
  gate

## Generic configuration

| Surface | Mhoo configuration | Compatibility rule |
| --- | --- | --- |
| Docker Compose | `PRODUCT_BRAND_PRESET` and `PRODUCT_BRAND_DEPLOYMENT_ORIGIN` are passed to server and worker | Existing service names, image references, volumes, database URLs, and secrets are unchanged |
| Helm | `brand.preset` and `brand.deploymentOrigin` render the same two environment keys | Chart name, release examples, resource names, selectors, PVCs, migrations, and technical values remain `twenty`-named |
| Podman | Compose and manual steps pass the same two keys | Container names, systemd filename, and upstream image reference remain stable technical identifiers |
| Raw Kubernetes | Server and worker manifests carry the reviewed Mhoo preset and example origin | Namespaces, labels, selectors, volumes, image names, and service wiring are unchanged |
| Terraform | `twentycrm_product_brand_preset` validates `mhoo` or `twenty`; an optional origin falls back to the existing app hostname | Existing variable names and resource addresses remain unchanged |
| Disposable validation Compose | Mhoo preset and the validation origin are explicit in `validation.env.example` | The image remains an immutable release input; no digest or live runtime is created here |

There is one documented generic application configuration path. Operators do
not set internal Foundation flags or hard-code Mhoo asset hosts. The source
examples require the selected Mhoo build to receive the same origin that the
operator exposes through `SERVER_URL`.

## Display and metadata decisions

| Path or surface | Decision | Classification and rationale |
| --- | --- | --- |
| Root README | Presents Mhoo as the governed distribution and links the local operator guide and ledger | Mhoo-owned display surface; no unverified Mhoo website or support destination is invented |
| Helm, Kubernetes, and Podman guides | Say “Mhoo, built on Twenty”; explain retained technical names and source-only status | Operator display; `twenty`, `twentycrm`, `my-twenty`, and file paths stay because renaming them would change compatibility expectations |
| Helm notes and values schema | Report and validate the selected product preset and deployment origin | Operator metadata; no selector, PVC, migration, or release-name change |
| Dockerfile and clean image workflow | Add Mhoo title/vendor/source/revision/description labels | Mhoo artifact identity; upstream source, version, commit, tree, and AGPL-3.0 labels are retained separately |
| Documentation package | Uses Mhoo distribution framing while labeling `docs.twenty.com` and the Twenty repository as upstream destinations | No Mhoo documentation URL is claimed without an owned, approved destination |
| Codex plugin README/package description | Uses Mhoo-compatible framing while retaining technical Twenty commands and MCP keys | Developer display metadata; the stable package, command, and `twenty` MCP identifiers are not renamed |
| Helm chart image default and upstream installer references | Retained as upstream compatibility inputs until a reviewed Mhoo immutable release artifact exists | Deliberate non-claim; MHO-179 does not invent a tag, retag an image, or publish a release |

## Retained Twenty identity

- Package names, Nx project names, import paths, Docker build targets,
  environment keys, command names, MCP keys, API/GraphQL names, migrations,
  database/schema names, resource names, selectors, PVC names, and existing
  volume names remain unchanged.
- The upstream Twenty icon in the Helm chart and upstream URLs in technical
  installer/plugin metadata remain only where they identify the upstream
  compatibility source. Operator prose labels them as upstream rather than as
  Mhoo-owned destinations.
- Twenty copyright, license, source, and attribution facts are not rewritten
  into Mhoo claims. The Mhoo product preset's legal and attribution states
  remain fail-closed until MHO-181.
- Existing `deploy/twenty-next` remains the governed disposable overlay. No
  parallel top-level deployment hierarchy, DNS change, provider mutation,
  credential rotation, Helm install, or production cutover is part of this
  issue.

## Artifact provenance

Mhoo-built OCI output identifies:

- Mhoo repository: `https://github.com/mhoo-os/mhoo-twenty-next`
- Mhoo revision: the build's `APP_VERSION` or workflow commit SHA
- Distribution title/vendor: `Mhoo built on Twenty` / `Mhoo`
- Upstream repository: `https://github.com/twentyhq/twenty`
- Upstream version: `v2.37.0`
- Upstream commit: `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`
- Upstream tree: `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`
- License: `AGPL-3.0`

The source-custody file continues to bind the exact upstream tree, lockfile,
and Dockerfile. Changing the Dockerfile requires updating its custody digest;
it does not change the upstream commit or tree identity.

## Proof matrix

| Case | Expected proof |
| --- | --- |
| Compose parse | Server and worker receive the two generic product variables without changing service wiring |
| Helm render | Default Mhoo preset and derived/explicit origin appear in both deployments; explicit Twenty fallback also renders |
| Kubernetes/Terraform parse | Existing resource addresses/selectors/volumes remain present and brand variables are additive |
| OCI metadata | Dockerfile and workflow contain Mhoo source/revision labels plus exact upstream provenance labels |
| Documentation audit | Customer/operator-facing Mhoo text does not point to an unverified Mhoo destination; retained Twenty destinations are labeled upstream |
| Technical identity diff | No package, import, command, route, schema, migration, resource, selector, or volume rename is introduced |
| Source custody | Upstream tree, lockfile, Dockerfile digest, and exact-head fixture pass |

This is source, template, metadata, and parse evidence for MHO-179. It does
not claim registry publication, disposable-runtime behavior, recovery,
production readiness, legal approval, or cutover.
