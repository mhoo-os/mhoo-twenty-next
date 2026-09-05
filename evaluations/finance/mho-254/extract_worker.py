#!/usr/bin/env python3
"""Run one extraction engine against one local synthetic PDF."""

from __future__ import annotations

import argparse
import json
import os
import resource
import socket
import sys
from pathlib import Path

from benchmark_core import extract_semantics


class NetworkDisabledError(OSError):
    """Raised when an offline benchmark dependency attempts network access."""


def install_network_guard() -> None:
    """Fail closed before parser imports can initialize model downloaders."""

    def blocked(*_args: object, **_kwargs: object) -> None:
        raise NetworkDisabledError("network access disabled by MHO-254 benchmark")

    socket.create_connection = blocked
    socket.socket.connect = blocked
    socket.socket.connect_ex = blocked


def pdfplumber_pages(path: Path) -> list[dict]:
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        return [{"page": index, "text": page.extract_text() or ""} for index, page in enumerate(pdf.pages, 1)]


def docling_pages(path: Path) -> list[dict]:
    from docling.document_converter import DocumentConverter

    result = DocumentConverter().convert(path)
    page_lines: dict[int, list[str]] = {}
    for item, _level in result.document.iterate_items():
        text = getattr(item, "text", None)
        if not text:
            continue
        provenance = getattr(item, "prov", None) or []
        page_number = provenance[0].page_no if provenance else 1
        page_lines.setdefault(page_number, []).append(text)
    if not page_lines:
        page_lines[1] = [result.document.export_to_markdown()]
    return [{"page": page, "text": "\n".join(lines)} for page, lines in sorted(page_lines.items())]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", choices=("pdfplumber", "docling"), required=True)
    parser.add_argument("--document-id", required=True)
    parser.add_argument("--kind", choices=("bank_statement", "settlement_export"), required=True)
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()

    network_disabled = os.environ.get("MHO254_NETWORK_DISABLED") == "1"
    if network_disabled:
        install_network_guard()
    pages = pdfplumber_pages(args.input) if args.engine == "pdfplumber" else docling_pages(args.input)
    output = {
        "engine": args.engine,
        "input": str(Path("corpus") / "originals" / args.input.name),
        "network_disabled": network_disabled,
        "pages": pages,
        "extraction": extract_semantics(args.document_id, args.kind, pages),
        "worker_peak_rss_bytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        * (1024 if sys.platform.startswith("linux") else 1),
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
