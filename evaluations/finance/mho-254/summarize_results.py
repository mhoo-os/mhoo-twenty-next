#!/usr/bin/env python3
"""Derive aggregate evidence from retained per-document measurements."""

from __future__ import annotations

import json
import statistics
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def main() -> None:
    benchmark = json.loads((ROOT / "results" / "benchmark.json").read_text())
    engines = sorted({row["engine"] for row in benchmark["results"]})
    summary = {"schema_version": 1, "engines": {}}
    for engine in engines:
        rows = [row for row in benchmark["results"] if row["engine"] == engine]
        expected = sum(row["expected_rows"] for row in rows)
        extracted = sum(row["extracted_rows"] for row in rows)
        amount_exact = sum(row["amount_exact"] for row in rows)
        date_exact = sum(row["date_exact"] for row in rows)
        summary["engines"][engine] = {
            "documents": len(rows),
            "rows_extracted": extracted,
            "rows_expected": expected,
            "row_recall": extracted / expected,
            "amount_accuracy": amount_exact / expected,
            "date_accuracy": date_exact / expected,
            "missing_rows": sum(row["missing_rows"] for row in rows),
            "unexpected_rows": sum(row["unexpected_rows"] for row in rows),
            "all_rows_traceable": all(row["source_trace_rows"] == row["extracted_rows"] for row in rows),
            "all_expected_arithmetic_outcomes": all(row["arithmetic_exact"] for row in rows),
            "runtime_seconds_total": round(sum(row["runtime_seconds"] for row in rows), 6),
            "runtime_seconds_median": round(statistics.median(row["runtime_seconds"] for row in rows), 6),
            "peak_rss_bytes_max": max(row["peak_rss_bytes"] for row in rows),
        }
    path = ROOT / "results" / "summary.json"
    path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
