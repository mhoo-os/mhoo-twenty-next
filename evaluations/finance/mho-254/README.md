# MHO-254 synthetic Finance parser benchmark

This isolated evaluation compares extraction components against deterministic,
synthetic-only PDFs. It is evidence for a later integration decision; it does
not add a Finance runtime dependency, install an agent skill, process customer
data, or change the canonical Twenty Finance objects.

## Reproduce

From this directory with Python 3.12 on x86-64 Linux:

```bash
python3 -m venv .venv
.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.8.0 torchvision==0.23.0
.venv/bin/pip install -r requirements.in
.venv/bin/python corpus/generate_corpus.py
.venv/bin/pytest
# A first online Docling pass downloads model assets; do not use source data here.
.venv/bin/python run_benchmark.py --engines docling
# The retained evidence is regenerated with model-network access disabled.
.venv/bin/python run_benchmark.py --offline
.venv/bin/python run_component_checks.py
.venv/bin/python summarize_results.py
```

Docling downloads model assets on its first online conversion. The retained run
is regenerated with `--offline`, which sets the Hugging Face/Transformers
offline flags and installs a fail-closed socket guard before importing either
parser. The retained worker therefore cannot download a missing RapidOCR model
or egress a source PDF. Do not use the first-run command with non-synthetic
data. Model download identities, hashes and license evidence are recorded in
`results/model-identities.json` and the report.

The generated PDFs and their `.source.txt` inputs are originals for this
benchmark. `corpus/manifest.json` hashes every original. Raw engine output is
retained under `results/raw/`; extraction failures are evidence and must not be
edited into success.

## Ownership boundary

The destination repository is pinned by MHO-123 to
`mhoo-os/mhoo-twenty-next`. Merged PR22 establishes ownership under
`packages/twenty-apps/internal/mhoo-finance/**`; this evaluation intentionally
lives outside that path. It treats PR22 head
`f236eefa3c42f2fe499ec82b42b4f42d0f9341b6` and landed main commit
`687ab9cd09f6ac9bf6a894c6d8ba5f9a345a79f9` as contract evidence for
`SourceArtifact`, `ImportReceipt`, `NormalizedFact`, `CoveragePeriod`,
`ReconciliationException`, and source-row traceability.
