# Authenticated UI and customer-copy touchpoint ledger

This ledger scopes the MHO-173 source change against the clean Twenty v2.37
foundation. It records which authenticated presentation seams consume the
governed product brand, which workspace values remain authoritative metadata,
and which upstream technical identifiers remain intentionally unchanged.

## Source and authority

- Foundation tag: `twenty/v2.37.0`
- Foundation commit: `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`
- Foundation tree: `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`
- Product identity source: `twenty-shared/branding` through `brandState`, with
  the reviewed `MHO_BRAND` preset as the pre-config fallback
- Workspace identity source: the existing authenticated current-workspace,
  available-workspace, or server-admin response; route IDs, hostnames, query
  values, tokens, and local storage do not select a workspace
- Provider identity source: provider-owned names, icons, protocol names, and
  external client documentation already used by the upstream surface

## Touchpoints

| Path or surface | Previous residue | Governed action | Authority rationale |
| --- | --- | --- | --- |
| Authenticated workspace switcher and navigation drawer | Defaulted missing workspace logos to an external Twenty placeholder and left missing names empty | Resolve current and available workspace presentation through `resolveWorkspacePresentation`; use the configured product mark/name only for missing workspace metadata | Existing authenticated workspace data remains authoritative; the product fallback is brand-owned and does not resolve routing or membership |
| Server-admin workspace and user detail views | Admin tabs and workspace cards used the same external placeholder logo | Apply the same resolver to the already-authorized admin query results | Admin responses are the authority for the displayed workspace; the fallback cannot infer a workspace from an admin route |
| Global workspace-selection form | Pre-auth workspace cards still used the external placeholder | Use the resolved product fallback while preserving the selected workspace name, logo, URL, and invite behavior | This is presentation only; workspace selection and redirect logic remain unchanged |
| OAuth and application connection header | Product side used a static Twenty integration logo | Use the resolved product mark and accessible product alt text; retain the connected app's provider-owned name and logo | Product identity is brand configuration; the connected application is caller/provider metadata |
| Standard and custom application descriptions | Customer copy named Twenty and linked directly to Twenty developer pages | Interpolate the resolved product name and canonical documentation URL; retain technical scaffold commands and API identifiers | The product shell is configurable while SDK/package/command names remain truthful technical identity |
| Community settings | Partner and changelog cards linked to upstream Twenty marketing paths | Use canonical configured documentation for the Mhoo preset and explicitly upstream framing for the Twenty preset | No Mhoo partner or changelog endpoint is invented; external upstream destinations remain explicit when retained |
| MCP setup cards and generated install links | Human-readable descriptions and connector names said Twenty | Use the configured product name for display and install labels while retaining the technical server key `twenty`; frame the official upstream ChatGPT app as upstream | MCP routing/configuration keys are technical contract; display names are product presentation |
| Enterprise and billing errors | Support guidance named the upstream Twenty team | Address the configured product support team | This is customer-facing product copy and does not alter billing or payment behavior |
| Import mapping and billing examples | A visible “Twenty fields” label and a Twenty subdomain example remained in reusable UI | Use the configured product name for the label and a neutral example hostname | These are presentation examples, not schema, routing, or API identifiers |

## Reviewed seams intentionally retained

- `MCP_SETUP.server.name` remains `twenty`, because it is the stable MCP
  configuration key and changing it would break existing client configuration.
- `MCP_SETUP.chatGptTwentyAppUrl` remains an upstream integration URL and is
  described as such when the Mhoo preset is active; it is not represented as a
  Mhoo-owned application.
- Provider names, client names, protocol names, package names, route names,
  GraphQL/API identifiers, generated paths, environment variables, and SDK
  commands remain unchanged.
- Upstream developer documentation links embedded in technical scaffold
  instructions remain truthful technical references; customer-facing links
  now come from the brand contract.
- DPA/legal publication behavior remains fail-closed and governed by MHO-181.
  This source change does not approve, publish, or rename an Mhoo legal
  document.
- Demo records and test fixtures retain upstream values where they are data
  examples rather than product identity; they are not used as product or
  workspace defaults.

## Proof matrix

| Case | Expected proof |
| --- | --- |
| No client brand has loaded | Authenticated presentation falls back to the reviewed Mhoo preset and never to an external placeholder asset |
| Resolved Mhoo brand | Product name, product mark, workspace fallback mark, documentation URL, MCP display labels, and support wording use Mhoo values |
| Resolved upstream brand | The same presentation seams can render the resolved Twenty preset without changing technical identifiers |
| Workspace has a non-empty name/logo | Existing authorized workspace metadata wins over the product fallback and stays scoped to that workspace |
| Workspace metadata is empty | Only the product fallback is used; no host, route, query, token, or other workspace is consulted |
| Upstream integration is retained | The destination and label explicitly identify the upstream Twenty integration |
| MCP configuration is generated | JSON key remains `twenty`; human-readable client labels use the selected product name |
| Legal publication is unavailable | No legal URL is synthesized or approved by MHO-173; MHO-181 remains the publication gate |

This is source-level evidence for MHO-173. It does not claim disposable
runtime, release, recovery, production, or cutover proof; those remain
downstream gates.
