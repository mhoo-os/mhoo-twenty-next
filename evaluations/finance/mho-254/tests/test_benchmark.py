from __future__ import annotations

import hashlib
import json
import socket
from pathlib import Path

import pandas as pd
import pandera.pandas as pa
import pytest
from pandera.typing import Series
from rapidfuzz import fuzz, process

from benchmark_core import extract_semantics, minor, score
from extract_worker import NetworkDisabledError, install_network_guard


ROOT = Path(__file__).resolve().parents[1]


class ExtractedRows(pa.DataFrameModel):
    date: Series[str] = pa.Field(str_matches=r"^\d{4}-\d{2}-\d{2}$")
    amount_minor: Series[int]
    source_page: Series[int] = pa.Field(ge=1)
    source_line: Series[int] = pa.Field(ge=1)

    class Config:
        strict = False
        coerce = False


def test_minor_uses_exact_decimal_arithmetic() -> None:
    assert minor("+1,234.56") == 123456
    assert minor("-0.10") == -10


def test_mismatch_is_flagged_without_repairing_source_numbers() -> None:
    pages = [{"page": 1, "text": "OPENING BALANCE: 400.00\n2026-04-02 | Deposit Beta | +200.00 | 600.00\n2026-04-09 | Service Fee | -10.00 | 600.00\nCLOSING BALANCE: 600.00"}]
    actual = extract_semantics("mismatch-bank-statement", "bank_statement", pages)
    assert actual["calculated_closing_minor"] == 59000
    assert actual["closing_minor"] == 60000
    assert actual["arithmetic_status"] == "FLAGGED"
    assert actual["silent_repair_performed"] is False


def test_incomplete_statement_is_rejected() -> None:
    pages = [{"page": 1, "text": "2026-04-02 | Deposit Beta | +200.00 | 600.00"}]
    actual = extract_semantics("incomplete", "bank_statement", pages)
    assert actual["arithmetic_status"] == "REJECTED_INCOMPLETE"


def test_duplicate_source_rows_remain_visible_and_are_detected() -> None:
    pages = [{"page": 1, "text": "2026-02-05 | SET-002 | 75.00 | -2.25 | 72.75\n2026-02-05 | SET-002 | 75.00 | -2.25 | 72.75"}]
    actual = extract_semantics("settlement-export", "settlement_export", pages)
    assert len(actual["rows"]) == 2
    assert actual["duplicate_ids"] == ["SET-002"]


def test_score_reports_missing_rows_instead_of_padding_results() -> None:
    expected = {"rows": [{"date": "2026-01-01", "amount_minor": 100}, {"date": "2026-01-02", "amount_minor": 200}], "expect_arithmetic": "PASS"}
    actual = {"rows": [{"date": "2026-01-01", "amount_minor": 100, "source_page": 1, "source_line": 1, "source_char_span": [0, 20]}], "duplicate_ids": [], "arithmetic_status": "PASS", "silent_repair_performed": False}
    assert score(actual, expected)["missing_rows"] == 1


def test_pandera_narrow_schema_accepts_valid_rows_and_rejects_bad_trace() -> None:
    valid = pd.DataFrame([{"date": "2026-01-01", "amount_minor": 100, "source_page": 1, "source_line": 4}])
    ExtractedRows.validate(valid)
    invalid = valid.assign(source_page=0)
    with pytest.raises(pa.errors.SchemaError):
        ExtractedRows.validate(invalid)


def test_rapidfuzz_is_candidate_generation_not_financial_proof() -> None:
    candidates = ["Synthetic Supply Store", "Synthetic Utility Bill"]
    match = process.extractOne("Synth Supply Stor", candidates, scorer=fuzz.WRatio)
    assert match is not None and match[0] == "Synthetic Supply Store" and match[1] < 100
    assert {"candidate": match[0], "score": match[1], "establishes_match": False}["establishes_match"] is False


def test_committed_corpus_manifest_matches_originals() -> None:
    manifest = json.loads((ROOT / "corpus" / "manifest.json").read_text())
    assert manifest["schema_version"] == 1
    assert len(manifest["files"]) == 8
    for entry in manifest["files"]:
        content = (ROOT / "corpus" / entry["path"]).read_bytes()
        assert len(content) == entry["bytes"]
        assert hashlib.sha256(content).hexdigest() == entry["sha256"]


def test_retained_benchmark_is_offline_and_preserves_failures() -> None:
    benchmark = json.loads((ROOT / "results" / "benchmark.json").read_text())
    assert benchmark["offline"] is True
    indexed = {(row["engine"], row["document_id"]): row for row in benchmark["results"]}

    pdf_scan = indexed[("pdfplumber", "scan-bank-statement")]
    assert pdf_scan["extracted_rows"] == 0
    assert pdf_scan["missing_rows"] == 2

    for document_id in (
        "text-bank-statement",
        "scan-bank-statement",
        "settlement-export",
        "mismatch-bank-statement",
    ):
        docling = indexed[("docling", document_id)]
        assert docling["missing_rows"] == 0
        assert docling["unexpected_rows"] == 0
        assert docling["date_exact"] == docling["date_total"]
        assert docling["amount_exact"] == docling["amount_total"]
        assert docling["silent_repair_performed"] is False

    for engine in ("pdfplumber", "docling"):
        mismatch = indexed[(engine, "mismatch-bank-statement")]
        assert mismatch["arithmetic_exact"] is True
        assert mismatch["silent_repair_performed"] is False

    for engine in ("pdfplumber", "docling"):
        for raw_file in (ROOT / "results" / "raw" / engine).glob("*.json"):
            raw = json.loads(raw_file.read_text())
            assert raw["network_disabled"] is True
            assert raw["input"].startswith("corpus/originals/")


def test_offline_worker_guard_blocks_socket_connections(monkeypatch: pytest.MonkeyPatch) -> None:
    with monkeypatch.context():
        install_network_guard()
        with pytest.raises(NetworkDisabledError):
            socket.create_connection(("127.0.0.1", 9))
