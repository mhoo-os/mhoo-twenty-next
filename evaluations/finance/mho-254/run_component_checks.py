#!/usr/bin/env python3
"""Execute the deliberately narrow Pandera and RapidFuzz checks."""

from __future__ import annotations

import json
import resource
import sys
import time
from pathlib import Path

import pandas as pd
import pandera.pandas as pa
from pandera.typing import Series
from rapidfuzz import fuzz, process


ROOT = Path(__file__).resolve().parent


class EvidenceRows(pa.DataFrameModel):
    date: Series[str] = pa.Field(str_matches=r"^\d{4}-\d{2}-\d{2}$")
    amount_minor: Series[int]
    source_page: Series[int] = pa.Field(ge=1)
    source_line: Series[int] = pa.Field(ge=1)

    class Config:
        strict = False
        coerce = False


def main() -> None:
    started = time.perf_counter()
    valid = pd.DataFrame([{"date": "2026-01-03", "amount_minor": 25000, "source_page": 1, "source_line": 5}])
    EvidenceRows.validate(valid)
    bad_trace_rejected = False
    try:
        EvidenceRows.validate(valid.assign(source_page=0))
    except pa.errors.SchemaError:
        bad_trace_rejected = True
    pandera_seconds = time.perf_counter() - started

    started = time.perf_counter()
    choices = ["Synthetic Supply Store", "Synthetic Utility Bill", "Synthetic Supply Storage"]
    ranked = process.extract("Synth Supply Stor", choices, scorer=fuzz.WRatio, limit=3)
    rapidfuzz_seconds = time.perf_counter() - started

    output = {
        "schema_version": 1,
        "pandera": {
            "valid_row_accepted": True,
            "invalid_source_page_rejected": bad_trace_rejected,
            "runtime_seconds": round(pandera_seconds, 6),
            "scope": "boundary shape and source-locator rules only; no accounting arithmetic",
        },
        "rapidfuzz": {
            "query": "Synth Supply Stor",
            "ranked_candidates": [{"candidate": name, "score": score} for name, score, _index in ranked],
            "runtime_seconds": round(rapidfuzz_seconds, 6),
            "establishes_financial_match": False,
            "scope": "candidate generation only; deterministic amount/date/account evidence must decide",
        },
        "peak_rss_bytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        * (1024 if sys.platform.startswith("linux") else 1),
    }
    destination = ROOT / "results" / "component-checks.json"
    destination.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
