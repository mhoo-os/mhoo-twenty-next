#!/usr/bin/env python3
"""Generate the deterministic, synthetic-only MHO-254 PDF corpus."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent
ORIGINALS = ROOT / "originals"

DOCUMENTS = {
    "text-bank-statement": {
        "kind": "bank_statement",
        "scanned": False,
        "opening_minor": 100_000,
        "closing_minor": 108_000,
        "expect_arithmetic": "PASS",
        "rows": [
            {"id": "bank-001", "date": "2026-01-03", "description": "Deposit Alpha", "amount_raw": "+250.00", "amount_minor": 25_000, "balance_raw": "1,250.00", "balance_minor": 125_000, "page": 1},
            {"id": "bank-002", "date": "2026-01-08", "description": "Supply Store", "amount_raw": "-50.00", "amount_minor": -5_000, "balance_raw": "1,200.00", "balance_minor": 120_000, "page": 1},
            {"id": "bank-003", "date": "2026-01-17", "description": "Utility Bill", "amount_raw": "-120.00", "amount_minor": -12_000, "balance_raw": "1,080.00", "balance_minor": 108_000, "page": 1},
        ],
    },
    "scan-bank-statement": {
        "kind": "bank_statement",
        "scanned": True,
        "opening_minor": 50_000,
        "closing_minor": 59_000,
        "expect_arithmetic": "PASS",
        "rows": [
            {"id": "scan-001", "date": "2026-03-02", "description": "Card Settlement", "amount_raw": "+125.00", "amount_minor": 12_500, "balance_raw": "625.00", "balance_minor": 62_500, "page": 1},
            {"id": "scan-002", "date": "2026-03-11", "description": "Bank Fee", "amount_raw": "-35.00", "amount_minor": -3_500, "balance_raw": "590.00", "balance_minor": 59_000, "page": 1},
        ],
    },
    "settlement-export": {
        "kind": "settlement_export",
        "scanned": False,
        "expected_duplicate_ids": ["SET-002"],
        "expect_arithmetic": "PASS",
        "rows": [
            {"id": "SET-001", "date": "2026-02-04", "gross_raw": "100.00", "gross_minor": 10_000, "fee_raw": "-3.00", "fee_minor": -300, "amount_raw": "97.00", "amount_minor": 9_700, "page": 1},
            {"id": "SET-002", "date": "2026-02-05", "gross_raw": "75.00", "gross_minor": 7_500, "fee_raw": "-2.25", "fee_minor": -225, "amount_raw": "72.75", "amount_minor": 7_275, "page": 1},
            {"id": "SET-002", "date": "2026-02-05", "gross_raw": "75.00", "gross_minor": 7_500, "fee_raw": "-2.25", "fee_minor": -225, "amount_raw": "72.75", "amount_minor": 7_275, "page": 1},
        ],
    },
    "mismatch-bank-statement": {
        "kind": "bank_statement",
        "scanned": False,
        "opening_minor": 40_000,
        "closing_minor": 60_000,
        "calculated_closing_minor": 59_000,
        "expect_arithmetic": "FLAGGED",
        "rows": [
            {"id": "mismatch-001", "date": "2026-04-02", "description": "Deposit Beta", "amount_raw": "+200.00", "amount_minor": 20_000, "balance_raw": "600.00", "balance_minor": 60_000, "page": 1},
            {"id": "mismatch-002", "date": "2026-04-09", "description": "Service Fee", "amount_raw": "-10.00", "amount_minor": -1_000, "balance_raw": "600.00", "balance_minor": 60_000, "page": 1},
        ],
    },
}


def money(minor: int) -> str:
    return f"{minor / 100:,.2f}"


def lines_for(name: str, spec: dict) -> list[str]:
    lines = ["MHO-254 SYNTHETIC FIXTURE - NOT A REAL ACCOUNT", f"DOCUMENT ID: {name}", ""]
    if spec["kind"] == "bank_statement":
        lines.extend([
            f"OPENING BALANCE: {money(spec['opening_minor'])}",
            "DATE | DESCRIPTION | AMOUNT | RUNNING BALANCE",
        ])
        lines.extend(
            f"{row['date']} | {row['description']} | {row['amount_raw']} | {row['balance_raw']}"
            for row in spec["rows"]
        )
        lines.extend(["", f"CLOSING BALANCE: {money(spec['closing_minor'])}"])
    else:
        lines.append("DATE | SETTLEMENT ID | GROSS | FEE | NET")
        lines.extend(
            f"{row['date']} | {row['id']} | {row['gross_raw']} | {row['fee_raw']} | {row['amount_raw']}"
            for row in spec["rows"]
        )
        lines.extend(["", "DUPLICATE ROW IS INTENTIONAL AND MUST REMAIN VISIBLE"])
    return lines


def make_text_pdf(path: Path, lines: list[str]) -> None:
    pdf = canvas.Canvas(str(path), pagesize=LETTER, invariant=1, pageCompression=1)
    text = pdf.beginText(54, 742)
    text.setFont("Courier", 10)
    for line in lines:
        text.textLine(line)
    pdf.drawText(text)
    pdf.showPage()
    pdf.save()


def make_scan_pdf(path: Path, lines: list[str]) -> None:
    image = Image.new("L", (2400, 3100), color=245)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 38)
    y = 180
    for line in lines:
        draw.text((150, y), line, font=font, fill=18)
        y += 82
    pdf = canvas.Canvas(str(path), pagesize=LETTER, invariant=1, pageCompression=1)
    pdf.drawImage(ImageReader(image), 0, 0, width=LETTER[0], height=LETTER[1], mask=None)
    pdf.showPage()
    pdf.save()


def main() -> None:
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    for name, spec in DOCUMENTS.items():
        path = ORIGINALS / f"{name}.pdf"
        lines = lines_for(name, spec)
        (ORIGINALS / f"{name}.source.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        (make_scan_pdf if spec["scanned"] else make_text_pdf)(path, lines)

    (ROOT / "ground_truth.json").write_text(
        json.dumps({"schema_version": 1, "documents": DOCUMENTS}, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest = {
        "schema_version": 1,
        "generator": "corpus/generate_corpus.py",
        "files": [
            {
                "path": str(path.relative_to(ROOT)),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "bytes": path.stat().st_size,
            }
            for path in sorted(ORIGINALS.iterdir())
        ],
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
