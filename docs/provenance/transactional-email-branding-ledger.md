# Transactional email branding and sender identity ledger

This ledger scopes MHO-175 against the clean Twenty v2.37 foundation. It
records the single resolved-brand input used by transactional email rendering,
the server boundary that supplies it, and the technical identities that remain
intentionally unchanged.

## Source and authority

- Foundation tag: `twenty/v2.37.0`
- Foundation commit: `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`
- Foundation tree: `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`
- Brand contract: `twenty-shared/src/branding`, resolved by the server
  `ProductBrandResolverService`
- Rendering boundary: the server resolves the brand and passes it explicitly
  to `twenty-emails`; the rendering library does not read deployment
  environment variables or select a preset
- Preview boundary: React Email preview props use an explicit upstream fixture
  resolved against `https://app.twenty.com`; this is not a production default

## Touchpoints

| Path or surface | Governed action | Classification |
| --- | --- | --- |
| Shared email layout, logo, footer, and explanatory copy | Consume `ResolvedBrand` for product title, mark, alt text, public URLs, legal availability, and attribution | Generic brand consumer; canonical contract required |
| Exported system email templates | Require the same `ResolvedBrand` input and interpolate the resolved product name in visible copy; preserve transaction facts and workspace/user data | Customer-facing; resolves to the selected product brand |
| Email asset URLs | Resolve approved relative asset paths against the resolved public deployment origin; preserve the manifest path, MIME type, dimensions, and aspect ratio | Generic brand consumer; no local path or hardcoded Mhoo host |
| Email render previews | Use an explicit upstream `TWENTY_BRAND` fixture so local previewing remains usable and validates fallback behavior | Test fixture explicitly exercising upstream fallback |
| Server email services | Resolve branding once at the server rendering/sending boundary and pass it to the template and sender formatter | Generic brand consumer; canonical resolver required |
| Sender display name | Format the configured envelope address as `<human sender> (via <product>)` when a human sender exists, otherwise `<product>`, with header control characters removed | Customer-facing sender identity; product contract plus configured address |
| From address, Reply-To, return path, provider credentials, and DNS | Keep existing configuration and transport behavior unchanged | Operational sender configuration; release audit only |

## Legal and attribution behavior

The Mhoo preset carries the approved Mhoo LLC legal entity and the five
hash-pinned public legal routes from MHO-226. Default email footers render Terms,
Privacy, Acceptable Use, Open Source, and DPA Status links from the resolved
deployment origin. The DPA agreement itself remains unavailable and URL-less;
no upstream legal or DPA destination is substituted for an Mhoo document.
Invitations use the owner-requested compact variant: Support, Terms and Privacy,
plus the approved legal entity and exact attribution linked to the Open Source
Notice. The unavailable DPA is hidden; approved document contents are unchanged.

The explicit upstream preset retains its approved upstream legal identity and
bounded `Powered by Twenty` attribution. The Mhoo preset renders that exact
approved wording only as a link to its hash-pinned Open Source Notice; it never
links the attribution to `twenty.com`.

## Retained technical identity

- Package, import, template, route, provider, and generated-client names remain
  Twenty technical identifiers.
- The upstream GitHub link and documentation links remain in the explicit
  upstream preset and are not presented as Mhoo-owned destinations.
- Transactional links supplied by the server remain intact; they are not
  rewritten by the brand adapter.
- Workspace display names and logos remain workspace-scoped inputs. They do not
  select the global brand or change authorization, routing, token, or tenant
  semantics.
- The removed `DefaultWorkspaceLogo` constant was a duplicated upstream asset
  path; workspace-email fallback now comes from the resolved asset manifest.

## Proof matrix

| Case | Expected proof |
| --- | --- |
| Mhoo HTML and plain text | Product identity, approved legal links, Mhoo LLC, and exact attribution use the resolved Mhoo origin; the compact invitation retains Terms/Privacy/Open Source, while other templates retain all five legal URLs |
| Upstream HTML and plain text | Twenty identity, upstream asset, documentation, legal, and bounded attribution behavior remain coherent |
| Relative Mhoo asset path | URL is absolute, uses the resolved deployment origin, and preserves the governed asset path |
| Invitation sender | Brand-only `MHOO` uses the existing configured envelope address; inviter identity remains in the body and the profile is unchanged |
| Header injection input | CR/LF in sender name or address is removed before formatting the display header |
| Missing legal document | No dead link or false approved claim is rendered |
| Workspace-specific email | Authorized workspace name/logo remains data input; product/legal identity remains global |
| Preview-only fallback | The renderer receives an explicit upstream fixture and no environment flag is consulted |

This is source and render evidence for MHO-175. It does not claim provider,
DNS, disposable-runtime, release, recovery, production, or cutover proof.


## Minimal private-deployment invitations (MHO-240)

The owner requested one product logo, inviter/workspace identity, a clear action,
no generic CRM positioning, and a shorter footer. Invitations omit the promotional
What Is Product block and redundant workspace image/card. The workspace remains
text data, so invitation delivery no longer reads, signs or transmits a private
workspace logo. Existing invitation URL, expiry, authorization and locale behavior
are unchanged.

The canonical Mhoo sender display name is now `MHOO`. Invitations omit the human
From-name override; other brand-only transactional senders also use this canonical
capitalization. The configured sending address and user profile are unchanged.

The server prepares the product mark as an inline MIME attachment before adding
an email job. It reads only the immutable selected preset's bundled raster from
`dist/front`; it never fetches an HTML image URL. HTML image sources become CID
references and matching remote image preloads are removed. Existing text,
transactional links and attachments are retained. No Cloudflare Access exception
or public workspace-file route is needed.

Image bytes are sniffed as PNG/JPEG/GIF/WebP and limited to 1 MiB. Streams are
closed and base64 strings are queued rather than streams, Buffers, or file paths.
Missing, unreadable, oversized, or unsupported optional images are omitted so a
logo cannot prevent delivery. No new dependencies or storage backend are added.

Deployment is explicitly held for the next combined application release. Source,
preview and MIME tests do not prove production delivery, native reset/verification,
or Gmail rendering. Existing owner-confirmed invitation delivery/acceptance is
retained; no test emails or owner password resets are authorized for this repair.
