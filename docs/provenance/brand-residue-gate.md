# Customer-brand residue gate

**ARCHITECTURE IMPACT: LOCAL**

MHO-182 adds a deterministic, fail-closed source and artifact check for the
Mhoo rebrand. Run it from the repository root with:

```text
python3 scripts/branding/check_customer_brand_residue.py
```

The check emits a stable JSON receipt containing the scanned commit, the
canonical touchpoint-ledger SHA-256, the two supported presets, artifact
fixture IDs, counts, and sorted violations. `--json` prints only that receipt
for CI consumers.

## What is governed

`brand-touchpoint-ledger.json` is the machine-readable map. Each scoped path
has an owner, rationale, bounded scope justification, and one of six
dispositions:

- customer-facing output resolves Mhoo;
- generic consumers use the canonical brand contract/resolver;
- technical Twenty identity is retained with a reason;
- legal/provenance identity is retained with a reason;
- `Powered by Twenty` is allowed only in an approved bounded attribution; or
- a test fixture explicitly exercises the upstream fallback.

The scanner checks the canonical preset/resolver, hash-pinned approved legal state,
customer-path literals and resolver bypasses, asset references, required
technical/provenance markers, the hash/dimension-custodied asset manifest, and
representative frontend, email, server-public, legal, and distribution
artifacts. Positive and deliberately failing mutation fixtures live under
`scripts/branding/fixtures/` and are covered by:

```text
python3 -m unittest discover -s scripts/branding -p 'test_*.py'
```

This is not a global ban on the word `Twenty`. Package names, routes, imports,
licenses, upstream source references, chart/image identifiers, retained
documentation, and the explicit upstream preset remain valid when their
ledger disposition and context explain them. A new exception must be added to
the ledger with an owner and reason; it must not be hidden in a scanner skip.

## Boundary

The gate proves source custody, static contract integrity, representative
production artifact identity, and asset custody. It does not prove a live
runtime, persisted-data recovery, production publication, or production
cutover. The legal text is approved by the hash-pinned MHO-226 packet;
MHO-183 remains the exact-candidate, disposable-runtime, release-window, and
reversible-release authorization gate.
