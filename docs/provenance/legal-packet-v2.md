# Mhoo Legal Packet v2.0 integration receipt

**ARCHITECTURE IMPACT: LOCAL**

This receipt scopes Linear issue MHO-226. The publication authority is the
attached canonical packet and its approval record, not repository prose or a
generated approximation.

## Approved packet identity

| Field | Receipt |
| --- | --- |
| Packet ID | `MHOO-LEGAL-2026-v2.0` |
| Packet version | `2.0` |
| Status | `APPROVED_FINAL` |
| Approver | `Tanyawit Nilnavarat` |
| Approval timestamp | `2026-09-02T20:43:58Z` |
| Effective date | `2026-09-02` |
| Contracting entity | `Mhoo LLC` |
| DPA state | `UNAVAILABLE_FAIL_CLOSED` |
| Canonical ZIP SHA-256 | `d671770856e0964dc17ecef54fbe7de1b620a86f8a7b3198ac6dd83a5bcf4145` |
| Canonical manifest SHA-256 | `57ffc6de05f1deb3c8db7b05fd9a1b7a09f7c8bc2996e1e859fbd2238ca227f5` |

## Custodied files and route mapping

The six approved packet files and the byte-identical manifest are committed
under `packages/twenty-front/src/legal/sources/`. Only the five public legal
documents are imported by the renderer. The approval record remains committed
for source custody and verification but is never bundled or rendered.

| Route | Source | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `/legal/terms` | `01-mhoo-master-terms-v2.0.md` | 6059 | `f8bfeb104b2b09064ef74a1f7e6bbae747ed9443fdc0d654a88d433b17daff16` |
| `/legal/privacy` | `02-mhoo-privacy-policy-v2.0.md` | 2155 | `d997c7fe762f8fe02043124ce6e43f482c77f5ac976649df37dcfad8d104867e` |
| `/legal/acceptable-use` | `03-mhoo-acceptable-use-policy-v2.0.md` | 1217 | `28c063f526be1752fa997529af80d105dfbfbb68a7e5ec4bea2c5ea770557ce8` |
| `/legal/open-source` | `04-mhoo-open-source-notice-v2.0.md` | 807 | `dd442db563d3472fe6ea57d899fa11bb2f1b4072f0de8282a63ba0971f1f70ee` |
| `/legal/dpa` | `05-mhoo-dpa-availability-notice-v2.0.md` | 799 | `1836355ef5e2e65bb68c0943e8b7f9034d043dbf4b692151addab08d0edb81ce` |

The approval-record source hash is
`96040a0a179eee3cf93b7a570febdc4bc42c39f8d1a1d971988e4a304e52f35c` and its
manifest byte count is `2198`.

## Deterministic verification

The build-blocking verifier enforces UTF-8, LF endings, exactly one terminal
newline, manifest identity and order, exact bytes and SHA-256 values, the
approved DPA state, and an allowlist of source-directory entries:

```text
node scripts/legal/verify_mhoo_legal_packet.mjs --json
node --test scripts/legal/verify_mhoo_legal_packet.test.mjs
```

`twenty-front:build` depends on `verify:legal-packet`; a changed source,
manifest, route mapping, or unexpected source entry fails before the frontend
build proceeds.

## Surface and safety boundary

- Root-domain and workspace-domain routers expose the same five exact paths.
- Frontend legal navigation uses the resolved brand contract; approved
  non-DPA documents link to their same-origin canonical route.
- The DPA page renders only the approved availability notice when the contract
  remains unavailable with `url: null`; it is omitted from actionable footer
  and email links, and no upstream DPA is relabeled.
- Email and server-public projections expose only approved Terms, Privacy,
  Acceptable Use, and Open Source links; configurable HTML values are escaped.
- Markdown rendering skips raw HTML, sanitizes link URLs, and adds
  `noopener noreferrer` to external links. Legal responses receive bounded
  cache, CSP, referrer, permissions, and content-type headers.
- Documentation legal entry points use the five canonical routes and label the
  retained Trust Center as upstream Twenty.

This is source, deterministic verification, and bounded integration evidence.
It is not a production deployment, final candidate, runtime, rollback, or
cutover receipt. Those remain downstream MHO-183 gates.
