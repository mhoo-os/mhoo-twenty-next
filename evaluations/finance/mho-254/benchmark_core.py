"""Strict semantic extraction and scoring for MHO-254."""

from __future__ import annotations

import re
from collections import Counter
from decimal import Decimal, InvalidOperation


MONEY = r"[+-]?[\$€£]?[\d,]+\.\d{2}"
BANK_ROW = re.compile(
    rf"(?P<date>\d{{4}}-\d{{2}}-\d{{2}})\s*\|?\s*"
    rf"(?P<description>[A-Za-z][A-Za-z0-9 ]+?)\s*\|\s*"
    rf"(?P<amount>{MONEY})\s*\|\s*(?P<balance>{MONEY})"
)
SETTLEMENT_ROW = re.compile(
    rf"(?P<date>\d{{4}}-\d{{2}}-\d{{2}})\s*\|?\s*"
    rf"(?P<id>SET-\d+)\s*\|\s*(?P<gross>{MONEY})\s*\|\s*"
    rf"(?P<fee>{MONEY})\s*\|\s*(?P<amount>{MONEY})"
)
OPENING = re.compile(rf"OPENING BALANCE\s*:?\s*(?P<value>{MONEY})", re.IGNORECASE)
CLOSING = re.compile(rf"CLOSING BALANCE\s*:?\s*(?P<value>{MONEY})", re.IGNORECASE)


def minor(raw: str) -> int:
    cleaned = raw.replace(",", "").replace("$", "").replace("€", "").replace("£", "")
    try:
        return int(Decimal(cleaned) * 100)
    except InvalidOperation as exc:
        raise ValueError(f"invalid money value: {raw!r}") from exc


def extract_semantics(document_id: str, kind: str, pages: list[dict]) -> dict:
    rows: list[dict] = []
    opening_minor = None
    closing_minor = None
    for page in pages:
        page_number = page["page"]
        for line_number, raw_line in enumerate(page["text"].splitlines(), start=1):
            line = re.sub(r"\s+", " ", raw_line).strip().strip("|").strip()
            if match := OPENING.search(line):
                opening_minor = minor(match.group("value"))
            if match := CLOSING.search(line):
                closing_minor = minor(match.group("value"))
            pattern = BANK_ROW if kind == "bank_statement" else SETTLEMENT_ROW
            for match in pattern.finditer(line):
                values = match.groupdict()
                item = {
                    "id": values.get("id") or f"{document_id}-row-{len(rows) + 1}",
                    "date": values["date"],
                    "amount_raw": values["amount"],
                    "amount_minor": minor(values["amount"]),
                    "source_page": page_number,
                    "source_line": line_number,
                    "source_char_span": [match.start(), match.end()],
                    "source_text": raw_line,
                }
                if kind == "bank_statement":
                    item.update(
                        description=values["description"].strip(),
                        balance_raw=values["balance"],
                        balance_minor=minor(values["balance"]),
                    )
                else:
                    item.update(
                        gross_raw=values["gross"],
                        gross_minor=minor(values["gross"]),
                        fee_raw=values["fee"],
                        fee_minor=minor(values["fee"]),
                    )
                rows.append(item)

    duplicate_ids = sorted(key for key, count in Counter(row["id"] for row in rows).items() if count > 1)
    incomplete = kind == "bank_statement" and (opening_minor is None or closing_minor is None)
    arithmetic_status = "REJECTED_INCOMPLETE" if incomplete else "PASS"
    calculated_closing_minor = None
    if kind == "bank_statement" and not incomplete:
        calculated_closing_minor = opening_minor + sum(row["amount_minor"] for row in rows)
        if calculated_closing_minor != closing_minor:
            arithmetic_status = "FLAGGED"
    elif kind == "settlement_export":
        if any(row["gross_minor"] + row["fee_minor"] != row["amount_minor"] for row in rows):
            arithmetic_status = "FLAGGED"

    return {
        "document_id": document_id,
        "kind": kind,
        "rows": rows,
        "opening_minor": opening_minor,
        "closing_minor": closing_minor,
        "calculated_closing_minor": calculated_closing_minor,
        "duplicate_ids": duplicate_ids,
        "arithmetic_status": arithmetic_status,
        "silent_repair_performed": False,
    }


def score(actual: dict, expected: dict) -> dict:
    expected_rows = expected["rows"]
    actual_rows = actual["rows"]
    paired = list(zip(actual_rows, expected_rows, strict=False))
    return {
        "expected_rows": len(expected_rows),
        "extracted_rows": len(actual_rows),
        "missing_rows": max(0, len(expected_rows) - len(actual_rows)),
        "unexpected_rows": max(0, len(actual_rows) - len(expected_rows)),
        "date_exact": sum(a["date"] == e["date"] for a, e in paired),
        "date_total": len(expected_rows),
        "amount_exact": sum(a["amount_minor"] == e["amount_minor"] for a, e in paired),
        "amount_total": len(expected_rows),
        "source_trace_rows": sum(bool(a.get("source_page") and a.get("source_line") and a.get("source_char_span")) for a in actual_rows),
        "duplicate_ids_exact": actual["duplicate_ids"] == expected.get("expected_duplicate_ids", []),
        "arithmetic_exact": actual["arithmetic_status"] == expected["expect_arithmetic"],
        "silent_repair_performed": actual["silent_repair_performed"],
    }
