# MHO-254 Finance parser and skill benchmark — v1

Date: 2026-09-05 UTC

Benchmark start base: `mhoo-os/mhoo-twenty-next@88a21f624f17ecce805fb7fd6f9d8dc3f7d3c8b6`

Publication base after PR22 merged: `mhoo-os/mhoo-twenty-next@687ab9cd09f6ac9bf6a894c6d8ba5f9a345a79f9`

Finance contract inspected read-only: PR22 head `f236eefa3c42f2fe499ec82b42b4f42d0f9341b6`

Scope: deterministic synthetic evidence only

## Decision

Use `pdfplumber==0.11.10` as the first parser for searchable PDFs. Wrap
`docling==2.126.0` as an isolated, resource-capped fallback only when the PDF
has no usable text layer or the first parser fails visible completeness and
control checks. Do not add standalone PaddleOCR or Marker now: Docling closed
the only evidenced scan gap. Do not install Open Accountant skills globally or
adopt a replacement accounting/ERP platform.

No runtime dependency is added by this PR. The recommendation is evidence for
a separately scoped MHO-126 implementation decision.

## Contract and ownership fit

The live MHO-123 correction makes `mhoo-os/mhoo-twenty-next` the canonical
repository for new Finance fixture and parser work. MHO-126 requires immutable
original artifacts, explicit sign/date mappings, parser versions, row-level
source locations, visible rejects, revisions, idempotency and exact statement
arithmetic. MHO-135 requires coverage-first answers, tool-produced totals,
snapshot/procedure receipts, lineage and limitations; agent prose cannot own
arithmetic or approve findings. MHO-146 and merged PR22 introduce
`SourceArtifact`, `ImportReceipt`, `NormalizedFact`, `CoveragePeriod`,
`ReconciliationException` and bounded trace primitives under
`packages/twenty-apps/internal/mhoo-finance/**`.

PR22 advanced from `ebbf039479c4a318328cd2d6b10af2fa91c1da5c` to the pinned
head above during this evaluation, then landed on main as
`687ab9cd09f6ac9bf6a894c6d8ba5f9a345a79f9`. Its delta was reviewed read-only:
it adds a synthetic fixture adapter and strengthens fail-closed Workspace/role
caveats, without moving parser ownership or authorizing runtime/provider
behavior.

This benchmark therefore lives at `evaluations/finance/mho-254/`, outside
PR22's owned path. It proposes outputs that map into those objects after
review; it does not create another database or mutate the App.

## Executed proof versus documentation

Executed here:

- generated four one-page PDF originals from deterministic source text;
- ran pdfplumber and Docling on the same originals;
- repeated the retained comparison with offline model flags and a worker-level
  socket guard installed before parser imports;
- compared exact dates and integer minor-unit amounts to ground truth;
- counted missing/unexpected rows and intentional duplicate IDs;
- verified page/line/character-span trace locators;
- calculated statement and settlement controls with integer minor units and
  flagged the deliberate mismatch without repairing it;
- measured fresh-process wall time and sampled parent/descendant peak RSS;
- executed narrow Pandera valid/invalid boundary checks and an ambiguous
  RapidFuzz ranking.

Documentation/desk review only:

- upstream maintenance, test/CI presence, dependency and egress descriptions;
- PaddleOCR, Marker, ERPClaw, YourFinanceWORKS, ERPNext, Obsigna, Nobulex and
  auditable behavior claims;
- accounting logic claimed by Open Accountant skills. The three reviewed skill
  paths contain instructions only, so no accounting implementation was proved.

This report makes no claim of audit-grade accuracy, privacy, compliance,
production readiness or generalization beyond the retained corpus.

## Corpus and ground truth

| Original | Form | Expected rows | Control |
|---|---|---:|---|
| `text-bank-statement.pdf` | searchable bank statement | 3 | opening 1,000.00 + net 80.00 = closing 1,080.00 |
| `scan-bank-statement.pdf` | image-only bank statement | 2 | opening 500.00 + net 90.00 = closing 590.00 |
| `settlement-export.pdf` | searchable settlement export | 3 | gross + fee = net per row; duplicate `SET-002` remains visible |
| `mismatch-bank-statement.pdf` | searchable deliberate mismatch | 2 | calculated 590.00 differs from printed 600.00; expected `FLAGGED` |

`corpus/manifest.json` records SHA-256 and byte length for each PDF and source
text. `corpus/ground_truth.json` preserves expected raw strings, minor-unit
values and pages. The runner never writes corrected source values.

## Extraction results

Retained measurement: `results/benchmark.json`, `offline: true`.

| Engine | Rows | Date accuracy | Amount accuracy | Missing | Controls | Median time | Max peak RSS |
|---|---:|---:|---:|---:|---|---:|---:|
| pdfplumber 0.11.10, all PDFs | 8/10 | 80% | 80% | 2 | 3/4 expected outcomes | 0.176 s | 32.6 MB |
| pdfplumber 0.11.10, searchable only | 8/8 | 100% | 100% | 0 | 3/3 | 0.182 s median across retained text cases | 32.6 MB |
| Docling 2.126.0, all PDFs | 10/10 | 100% | 100% | 0 | 4/4 | 17.262 s | 2.110 GB |

Every extracted row had a source page, line and character span. Both engines
preserved the duplicate settlement row when they extracted it. Both retained
the printed mismatch closing balance and emitted `FLAGGED`; neither silently
repaired a number.

The corpus is intentionally small and clean. Accuracy percentages are fixture
scores, not expected real-statement performance. Timing includes starting a
fresh Python worker and imports for each one-page document. Peak RSS was sampled
every 20 ms and backed by each worker's own maximum-RSS reading.

## Failed cases and setup evidence

`results/setup-failures.json` retains three failures:

1. Default Docling installation on Linux selected a large CUDA stack for this
   CPU-only machine. The install was stopped and CPU-only Torch was pinned.
2. Docling's first model download failed before source processing because the
   task SOCKS proxy required undeclared `socksio`; `socksio==1.0.0` was pinned.
3. pdfplumber extracted zero rows and no balances from the image-only PDF. The
   failure remains in `results/raw/pdfplumber/scan-bank-statement.json`.

The first successful Docling online pass downloaded model assets. The retained
pass was then executed with `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`, and
`MHO254_NETWORK_DISABLED=1`. The worker installs a socket guard before parser
imports, so a missing model fails instead of reaching Hugging Face, ModelScope,
or another network endpoint. Only local synthetic PDF paths were passed.

## Component decisions

| Candidate | Decision | Evidence and boundary |
|---|---|---|
| pdfplumber | **USE** | Exact on all 8 searchable rows/controls, fastest and smallest; cannot parse scans alone. |
| Docling | **WRAP** | Exact 10/10 including scan; isolate behind no-text/failure routing, resource caps and local-only models. |
| PaddleOCR | **DEFER** | Standalone library not installed: Docling closed the scan gap. Code is Apache-2.0; model identity/license would require a new proof. |
| Marker | **DEFER** | No remaining gap. Apache-2.0 code but modified OpenRAIL-M weights and optional cloud LLM paths add review surface. |
| Pandera | **REFERENCE** | Executed schema check rejected an invalid page locator in 0.021 s; useful pattern, but pandas/Python is not justified solely for this validation. |
| RapidFuzz | **WRAP** | Executed query ranked two near candidates 87.18 and 82.93. It may propose candidates only; exact amount/date/account evidence must decide. |
| Open Accountant skills | **REFERENCE** | MIT instruction set; selected patterns only after governed tool replacement. No executable accounting proof at reviewed paths. |
| ERPClaw | **REFERENCE** | Decimal/immutable reversal/transaction patterns are useful; GPL-3.0 mutating ERP and command router must not replace Twenty. |
| YourFinanceWORKS | **REJECT** | Overlapping full stack, split AGPL/commercial licensing, provider/AI/fraud surfaces and a new source of truth. |
| ERPNext | **REFERENCE** | Mature GPL-3.0 accounting concepts only; adopting Frappe would replace the accepted platform. |
| Obsigna | **REFERENCE** | Signed receipt and raw forward-compatible verification patterns only; existing Mhoo receipts remain authoritative. |
| Nobulex | **REJECT** | Pinned README says this is a prior direction; trust-score authority overlaps current factory governance. |
| auditable | **REFERENCE** | Useful declared/observed provenance and withheld-score patterns; do not add another Finance/factory audit authority. |

Exact commit, version, license, maintenance/test signal, execution requirements
and egress notes for every candidate are retained in `candidates.json`.

## Open Accountant read-only workflow review

Pinned source: `openaccountant/skills@f5abe381f24b5b7d59f1d0b4a825b14494ff2034`.

- `import-transactions`: **REJECT** as a Finance skill. It prescribes inserts,
  categorization, destructive manual duplicate removal, and date+amount+text
  dedupe without artifact hashes, parser revisions or exact source pointers.
  Header-profile examples are reference material only.
- `month-end-close`: **REFERENCE** its ordered checklist and refusal to skip a
  difference. Replace all search/summary/categorization steps with governed,
  read-only MHO-135 tools; the agent may not close a period.
- `profit-loss`: **REFERENCE** its reader-facing layout and explicit cash-basis
  limitation. Raw amount sign and manual category choices cannot establish
  revenue/expense, and agent arithmetic cannot replace receipt-bound procedures.

`open-accountant-skill-evaluation.json` records exact blob SHAs, contract
failures and safe adaptations. No Wilson call, database write, web converter or
skill installation occurred.

## Licensing, models and egress

- pdfplumber code: MIT, repository
  `4c64b92d5caccd71c645e98e0fabb0c4dba7ff45`; no model.
- Docling code: MIT, repository
  `025b27ca2c2f040b5b9628dccffd2611246990ca`.
- Docling default layout model: `docling-project/docling-layout-heron` snapshot
  `8f39ad3c0b4c58e9c2d2c84a38465abf757272d8`, Apache-2.0 model card.
- Docling model bundle: `docling-project/docling-models` tag `v2.3.0`, snapshot
  `fc0f2d45e2218ea24bce5045f58a389aed16dc23`, CDLA-Permissive-2.0 model card.
- Docling also executed bundled RapidOCR 3.9.2 (Apache-2.0 package metadata)
  with locally cached PP-OCRv6 detection/recognition and mobile orientation
  weights. Their exact SHA-256 values and ModelScope source URLs are retained in
  `results/model-identities.json`. PaddleOCR's repository is Apache-2.0, but
  model-artifact notice obligations still require legal review before shipping.
- Marker code is Apache-2.0; its pinned README states modified OpenRAIL-M model
  terms and optional external LLM services. It was not executed.
- PaddleOCR code is Apache-2.0. No separate model was selected, downloaded or
  licensed because it was not needed.

The benchmark proves local-only source processing only for the retained offline
run. It does not prove that every optional candidate configuration is local or
privacy-preserving.

## Smallest integration proposal

For a separately authorized MHO-126 slice:

1. Keep the original artifact immutable and hash-receipted by the existing
   `SourceArtifact`/`ImportReceipt` owner before parsing.
2. Route searchable PDFs to a pinned pdfplumber worker. If the text layer is
   absent or strict completeness/control checks reject the result, route the
   same immutable artifact to a resource-capped, network-disabled Docling
   worker with pre-provisioned model snapshots.
3. Write neither engine output directly to authoritative Finance facts. Emit a
   versioned candidate parse containing original strings, normalized minor
   units, parser/model identities, rejects, duplicate candidates and exact
   page/row/character lineage.
4. Run deterministic sign/date/profile validation and statement arithmetic.
   Incomplete or inconsistent parses enter review; corrections create a new
   parse/import result linked to the original.
5. Allow RapidFuzz only to rank match candidates. A separate deterministic
   match procedure must require exact financial evidence and produce its own
   receipt.

This adds no dashboard service, identity system, orchestration layer, provider
connection or accounting source of truth.

## Reproduction

```bash
cd evaluations/finance/mho-254
python3 -m venv .venv
.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.8.0 torchvision==0.23.0
.venv/bin/pip install -r requirements.in
.venv/bin/python corpus/generate_corpus.py
.venv/bin/pytest -q
# First Docling run downloads model assets; use synthetic inputs only.
.venv/bin/python run_benchmark.py --engines docling
# Retained comparison, with Hugging Face and Transformers forced offline.
.venv/bin/python run_benchmark.py --offline
.venv/bin/python run_component_checks.py
.venv/bin/python summarize_results.py
```

Environment: CPython 3.12.13, Linux 6.18.35 x86-64, glibc 2.39, nine visible
CPUs, CPU-only Torch 2.8.0. Exact installed packages are in
`requirements.freeze.txt`.

Independent review follow-ups (Medium/Low, not adoption blockers): strengthen
the scorer beyond positional date/net matching to cover every raw field and
locator resolution; turn the frozen environment into a hash-verified lock;
record/vendor the scan fixture font for cross-host regeneration; and keep raw
input labels corpus-relative. The last item was corrected during review; the
first three remain explicit follow-up work for any integration benchmark.

## Limitations and stop conditions

- Four one-page English fixtures do not cover varied institutions, rotations,
  handwriting, damaged scans, multi-page completeness, locale/date ambiguity,
  negative-parentheses formats or adversarial PDFs.
- Character spans refer to each engine's extracted text block, not PDF byte
  offsets. A future integration must preserve engine-native bounding boxes when
  available.
- Docling memory makes it unsuitable for unconstrained in-process serverless
  execution. Do not integrate without worker isolation, size/page/time/memory
  limits, offline model provisioning and a tested failure queue.
- Stop adoption if model snapshots/licenses cannot be reproduced, network-off
  execution fails, original hashes/source locators are lost, or any parser
  mutates authoritative facts directly.
- No real Hass/customer file, operational credential, provider, deployment,
  production/config/DNS change, financial posting or merge occurred.

## Primary sources

- [pdfplumber pinned source](https://github.com/jsvine/pdfplumber/tree/4c64b92d5caccd71c645e98e0fabb0c4dba7ff45)
- [Docling pinned source](https://github.com/docling-project/docling/tree/025b27ca2c2f040b5b9628dccffd2611246990ca)
- [Docling layout model card](https://huggingface.co/docling-project/docling-layout-heron/tree/8f39ad3c0b4c58e9c2d2c84a38465abf757272d8)
- [Docling model bundle card](https://huggingface.co/docling-project/docling-models/tree/fc0f2d45e2218ea24bce5045f58a389aed16dc23)
- [Open Accountant skills pinned source](https://github.com/openaccountant/skills/tree/f5abe381f24b5b7d59f1d0b4a825b14494ff2034)
- Remaining pinned repositories and license evidence are enumerated in
  `candidates.json`.
