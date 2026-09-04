# Mhoo Legal Packet v2.0 source and release evidence

MHO-226 imports and renders the approved legal packet without rewriting its
content. The canonical source is Linear attachment
`4a52216a-30bc-4c08-80d5-afffeea0ab99`; its ZIP SHA-256 is
`d671770856e0964dc17ecef54fbe7de1b620a86f8a7b3198ac6dd83a5bcf4145`.
The standalone manifest attachment
`243372ba-90dc-4522-b0e0-714763c0e1ce` is byte-identical to the ZIP manifest.

## Approval and custody

- Packet ID: `MHOO-LEGAL-2026-v2.0`
- Status: `APPROVED_FINAL`
- Approver: Tanyawit Nilnavarat
- Approval timestamp: `2026-09-02T20:43:58Z`
- Effective date: `2026-09-02`
- Contracting entity: `Mhoo LLC`
- DPA state: `UNAVAILABLE_FAIL_CLOSED`
- Manifest SHA-256: `57ffc6de05f1deb3c8db7b05fd9a1b7a09f7c8bc2996e1e859fbd2238ca227f5`

The repository keeps the manifest and all six governed Markdown files under
`docs/legal/mhoo/v2.0/`. `scripts/legal/verify_mhoo_legal_packet.py` verifies
the pinned manifest digest, metadata, exact file set, per-file byte counts and
SHA-256 values, UTF-8/LF canonicalization, and the exact five-route set. Its
mutation tests prove altered text, a missing file, CRLF drift, and a replaced
manifest fail closed.

## Public route mapping

| Route | Canonical source | SHA-256 | Bytes |
| --- | --- | --- | ---: |
| `/legal/terms` | `01-mhoo-master-terms-v2.0.md` | `f8bfeb104b2b09064ef74a1f7e6bbae747ed9443fdc0d654a88d433b17daff16` | 6059 |
| `/legal/privacy` | `02-mhoo-privacy-policy-v2.0.md` | `d997c7fe762f8fe02043124ce6e43f482c77f5ac976649df37dcfad8d104867e` | 2155 |
| `/legal/acceptable-use` | `03-mhoo-acceptable-use-policy-v2.0.md` | `28c063f526be1752fa997529af80d105dfbfbb68a7e5ec4bea2c5ea770557ce8` | 1217 |
| `/legal/open-source` | `04-mhoo-open-source-notice-v2.0.md` | `dd442db563d3472fe6ea57d899fa11bb2f1b4072f0de8282a63ba0971f1f70ee` | 807 |
| `/legal/dpa` | `05-mhoo-dpa-availability-notice-v2.0.md` | `1836355ef5e2e65bb68c0943e8b7f9034d043dbf4b692151addab08d0edb81ce` | 799 |

The browser source module is a deterministic projection of those five files.
Its generator checks freshness by default and writes only with `--write`.
Runtime routes require the Mhoo preset, an approved document, the deployment
origin, and the exact canonical path with no query or fragment. Missing client
configuration, the upstream preset, a hostile origin, or a modified path
renders a generic unavailable state and never exposes Mhoo legal text.

All five pages share semantic navigation, a skip link, a labeled article,
descriptive logo alternative text, visible keyboard focus, mobile wrapping,
200%-zoom-friendly flow, horizontally scrollable tables, safe external-link
attributes, and print rules. Transactional-email and server-public footers use
the same approved five-link contract. The DPA Status link points only to the
fail-closed notice; `brand.legal.dpa` remains unavailable with a null URL.

## Release boundary

This evidence authorizes source review only. It does not publish these routes
or mutate a running environment. Production publication remains gated by
MHO-183 and requires an owner authorization that names all of:

1. the exact merged candidate commit;
2. manifest SHA-256
   `57ffc6de05f1deb3c8db7b05fd9a1b7a09f7c8bc2996e1e859fbd2238ca227f5`;
3. an explicit UTC release window; and
4. the tested rollback target.

Until that authorization exists, the release window is deliberately
`NOT_SCHEDULED` and publication must not proceed.
