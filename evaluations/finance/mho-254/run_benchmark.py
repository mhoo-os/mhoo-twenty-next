#!/usr/bin/env python3
"""Execute and retain MHO-254 extraction evidence."""

from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import sys
import time
from importlib.metadata import version
from pathlib import Path

import psutil

from benchmark_core import score


ROOT = Path(__file__).resolve().parent


def run_worker(engine: str, document_id: str, spec: dict, offline: bool) -> tuple[dict, dict]:
    command = [
        sys.executable,
        str(ROOT / "extract_worker.py"),
        "--engine", engine,
        "--document-id", document_id,
        "--kind", spec["kind"],
        "--input", str(ROOT / "corpus" / "originals" / f"{document_id}.pdf"),
    ]
    env = os.environ.copy()
    if offline:
        env.update(
            HF_HUB_OFFLINE="1",
            TRANSFORMERS_OFFLINE="1",
            MHO254_NETWORK_DISABLED="1",
        )
    started = time.perf_counter()
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
    peak_rss = 0
    try:
        tracked = psutil.Process(process.pid)
    except psutil.NoSuchProcess:
        tracked = None
    while process.poll() is None:
        try:
            if tracked is None:
                tracked = psutil.Process(process.pid)
            peak_rss = max(peak_rss, tracked.memory_info().rss)
            peak_rss = max(peak_rss, tracked.memory_info().rss + sum(child.memory_info().rss for child in tracked.children(recursive=True)))
        except psutil.Error:
            pass
        time.sleep(0.02)
    stdout, stderr = process.communicate()
    elapsed = time.perf_counter() - started
    if process.returncode:
        raise RuntimeError(f"{engine} failed for {document_id}: {stderr[-4000:]}")
    raw = json.loads(stdout)
    peak_rss = max(peak_rss, raw.get("worker_peak_rss_bytes", 0))
    raw["stderr"] = stderr
    metrics = score(raw["extraction"], spec)
    metrics.update(runtime_seconds=round(elapsed, 6), peak_rss_bytes=peak_rss)
    return raw, metrics


def environment() -> dict:
    packages = ["pdfplumber", "docling", "docling-core", "docling-ibm-models", "docling-parse", "rapidocr", "pandera", "pandas", "rapidfuzz", "torch", "torchvision"]
    return {
        "python": sys.version,
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "cpu_count": os.cpu_count(),
        "packages": {name: version(name) for name in packages},
        "measurement": "wall clock includes fresh Python process/import; peak RSS sampled every 20ms for parent and descendants",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--engines", nargs="+", choices=("pdfplumber", "docling"), default=("pdfplumber", "docling"))
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Require pre-provisioned models and fail closed on worker network access",
    )
    args = parser.parse_args()
    truth = json.loads((ROOT / "corpus" / "ground_truth.json").read_text())
    raw_root = ROOT / "results" / "raw"
    raw_root.mkdir(parents=True, exist_ok=True)
    rows = []
    for engine in args.engines:
        (raw_root / engine).mkdir(exist_ok=True)
        for document_id, spec in truth["documents"].items():
            raw, metrics = run_worker(engine, document_id, spec, args.offline)
            (raw_root / engine / f"{document_id}.json").write_text(json.dumps(raw, indent=2) + "\n")
            rows.append({"engine": engine, "document_id": document_id, "scanned": spec["scanned"], **metrics})
    output = {"schema_version": 1, "offline": args.offline, "environment": environment(), "results": rows}
    (ROOT / "results" / "benchmark.json").write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
