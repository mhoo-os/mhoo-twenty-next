# Auth, onboarding, and pre-auth touchpoint ledger

This ledger scopes the MHO-171 source change against the clean Twenty v2.37
foundation. It records which visible identity seams are governed by the
resolved product brand, which values remain workspace or provider metadata, and
which upstream technical strings are intentionally retained.

## Source and authority

- Foundation tag: `twenty/v2.37.0`
- Foundation commit: `6da524b8903ec16a3eeea4b2e4a5fb63dbfc1c58`
- Foundation tree: `3ce4ef3eac3604ee52b6b8ee0f1a4766d7f533ca`
- Product identity source: `twenty-shared/branding` through `brandState`
- Pre-config fallback: the reviewed `MHO_BRAND` preset
- Workspace identity source: existing authorized `workspacePublicData` or
  workspace activation data; hostnames, query values, tokens, and referers do
  not select a brand or workspace
- Provider identity source: the provider-owned labels and icons already used by
  the authentication and import flows

## Touchpoints

| Path | Surface | Identity before MHO-171 | Governed action | Authority rationale |
| --- | --- | --- | --- | --- |
| `packages/twenty-front/src/pages/auth/SignInUp.tsx` | Global sign-in/sign-up title | Literal `Welcome to Twenty` | Read the resolved product name; retain workspace and invite names | Global product identity is product configuration; workspace and invite names are existing resolved metadata |
| `packages/twenty-front/src/modules/auth/sign-in-up/components/FooterNote.tsx` | Global and workspace legal footer | Hard-coded Twenty legal URLs and copy | Read approved document URLs only; show an explicit unavailable state otherwise | Legal publication status is part of the brand contract and must fail closed |
| `packages/twenty-front/src/modules/auth/components/Logo.tsx` | Sign-in, password reset, and activation logo | Upstream default launcher icon | Use the product mark from the resolved brand when no explicit primary logo exists | An explicit primary logo remains caller-owned workspace metadata; the product fallback is brand-owned |
| `packages/twenty-front/src/modules/onboarding/components/OnboardingHeader.tsx` | Onboarding header mark | Static Twenty SVG | Use the resolved product mark | This is product presentation and has no authority or routing behavior |
| `packages/twenty-front/src/modules/onboarding/components/OnboardingPulsingLogo.tsx` | Verification/onboarding loading mark | Static Twenty SVG | Use the resolved product mark and preserve decorative loading semantics | Loading presentation must not infer identity from URL or state outside the brand contract |
| `packages/twenty-front/src/modules/onboarding/components/import-contacts/OnboardingImportPreviewSyncBadge.tsx` | Import preview destination mark | Static Twenty SVG | Use the resolved product mark; retain Google and Microsoft icons | The destination is Mhoo/Twenty product presentation; source providers remain provider-owned |
| `packages/twenty-front/src/pages/not-found/NotFound.tsx` | Public error document title | Literal `Page Not Found \| Twenty` | Let the existing page-title resolver apply the resolved product name | Document title is product presentation and does not affect navigation |

## Reviewed seams intentionally retained

- `packages/twenty-front/src/pages/auth/Authorize.tsx` contains an OAuth
  presentation illustration but no customer-visible product identity string.
  The OAuth app name and requested permissions remain caller-provided OAuth
  data; this change does not alter the OAuth flow.
- `packages/twenty-front/src/modules/auth/services/AuthService.ts` retains the
  `Twenty-Refresh` logger label as an internal diagnostic identifier. It is not
  rendered to customers and changing it would add log-correlation churn without
  improving product presentation.
- Google, Microsoft, Gmail, and Outlook names/icons remain provider-owned.
- Explicit workspace logos and workspace display names remain untouched. They
  are used only after the existing workspace resolver or activation flow has
  supplied them.
- Technical route names, token parameters, return paths, API operations,
  package names, and test fixtures are not branding surfaces and remain
  unchanged.

The reviewed support, status, documentation, contact, and attribution fields
remain available through `ResolvedBrand`. MHO-171 does not invent an auth-page
support or attribution link where the current v2.37 surface has none. Any
future visible use must consume those fields and their status rather than
reintroducing an upstream URL.

## Journey coverage

The shared seams above cover the presentation path for:

1. global sign-in and sign-up;
2. workspace sign-in and sign-up;
3. workspace invitation entry;
4. email verification sent, verification, and error states;
5. password reset;
6. SSO and OAuth provider selection;
7. workspace creation and onboarding activation;
8. onboarding loading and import preview;
9. public not-found rendering; and
10. global and workspace legal footer rendering.

The implementation preserves origin selection, workspace resolution, invite
handling, token exchange, SSO bypass, return paths, and membership behavior.

## Source proof matrix

| Case | Expected proof |
| --- | --- |
| No client brand has been loaded | Product presentation falls back to `MHO_BRAND`; no Twenty customer-facing default remains in the touched seams |
| Resolved Mhoo brand | Mhoo product name and Mhoo product mark are used; unapproved/unavailable legal documents produce no links |
| Resolved upstream fallback brand | The same seams can render the resolved Twenty preset without hard-coded Twenty assumptions |
| Resolved workspace with custom logo/name | Existing workspace logo/name remain authoritative and are not replaced by the product fallback |
| Provider-enabled authentication/import | Provider labels and icons remain unchanged |
| Legal status not approved or URL absent | No URL is synthesized from website, host, query, or upstream legal paths; an explicit unavailable state is rendered |
| Auth and onboarding interaction | Tests/builds cover presentation only; no auth request, token, origin, routing, or membership behavior is changed |

This is source-level evidence for MHO-171. It does not claim disposable
runtime, release, or production proof; those remain downstream gates.
