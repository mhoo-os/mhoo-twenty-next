# Server-public presentation ledger

This ledger scopes MHO-177 against the clean Twenty v2.37 foundation. It
records the server-generated public surfaces that were audited and the single
resolved-brand adapter used by customer-facing HTML and unsubscribe text.

## Source and authority

- Foundation tag: `twenty/v2.37.0`
- Foundation commit: `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`
- Foundation tree: `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`
- Global product identity: `ProductBrandResolverService`, resolved from the
  reviewed `PRODUCT_BRAND_PRESET` and deployment origin
- Public-page boundary: `EmailingPublicPageBrand`, which exposes only escaped
  presentation values and approved legal links
- Workspace identity: the already-authorized workspace invitation/access
  result; workspace names and logos never select the global product brand

## Audited surfaces

| Surface | Result | Authority and retained identity |
| --- | --- | --- |
| Workspace invitations | Transactional invitation output already consumes the resolved brand through `twenty-emails`; sender, product name, logo, and footer are brand inputs | Authorized workspace display data remains workspace-scoped; invitation tokens, links, and authorization behavior are unchanged |
| Unsubscribe preferences and result pages | HTML builders and controller now consume `EmailingPublicPageBrand`; product header, asset, support link, legal state, and attribution come from the adapter | Token verification, suppression, form methods, paths, and response content type remain unchanged |
| Unsubscribe links appended to email bodies | HTML and text footers use the same adapter and escape the unsubscribe URL and product name | Provider/domain/token construction remains unchanged |
| Approved-access-domain notifications | Transactional notification already passes the resolved brand to `twenty-emails` | Workspace name/logo and validation link remain authorized data inputs |
| Authentication, reset, verification, billing, admin, and workspace-cleanup notifications | Existing server senders route through the resolved `twenty-emails` contract | Operational addresses, links, provider names, and technical identifiers remain unchanged |
| Server-rendered HTML inventory | The unsubscribe builders are the product-facing server HTML builders found in the audited scope. Apollo Playground is a technical developer tool, and route-trigger HTML is caller-provided response content; neither is a Mhoo product shell | Technical upstream names and caller-owned response bodies are not rewritten as customer branding |
| Authenticated DPA preview/signing surface | DPA preview and signed-document generation remain an upstream legal/provenance capability. The Mhoo preset keeps the DPA agreement unavailable while approving only the hash-pinned DPA availability notice; the existing self-hosted signing guard retains the explicit Twenty legal identity and prevents execution | No upstream DPA is exposed through Mhoo public links or presented as an Mhoo agreement. The MHO-226 packet is approved; MHO-183 remains the publication/release gate |
| API, callback, maintenance, access-denied, and public-function failures | No additional server-owned product HTML shell was found in the audited source; JSON/errors preserve their existing status and technical contract | Error details remain bounded by their existing authorization and transport behavior |

## Legal and attribution behavior

The adapter emits Privacy, Terms, Acceptable Use, Open Source, and DPA Status
links only when each document is explicitly `approved` and has a non-empty
URL. The Mhoo preset exposes the five hash-pinned routes and Mhoo LLC, while
the DPA agreement remains unavailable and URL-less. The separately
authenticated DPA resolver remains upstream legal/provenance content, is
visibly marked as not applicable for self-hosted deployments, and cannot sign
in that mode. `Powered by Twenty` is emitted only as the approved bounded link
to the packet's open-source notice; no link targets `twenty.com`.

## Safety and compatibility proof

- Configurable product names, alt text, asset URLs, support URLs, legal URLs,
  attribution, tokens, and form paths are escaped in their HTML context.
- The server resolver, not Host, Origin, Referer, query data, or workspace
  display data, selects the global preset.
- Pages remain JavaScript-free and preserve the existing GET/POST, token,
  suppression, and content-type behavior.
- The exact-head trajectory fixture permits only the bounded server-public
  paths listed in the clean-foundation overlay.

This is source and focused-render evidence for MHO-177. It does not claim
runtime, release, recovery, production, or legal-publication approval; those
remain downstream gates.
