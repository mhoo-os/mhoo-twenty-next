#!/usr/bin/env python3
"""Verify Mhoo asset custody and the generated asset manifest."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "packages/twenty-front/public/images/mhoo"
MANIFEST_PATH = ASSET_ROOT / "asset-manifest.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    source = manifest["source"]
    source_path = ASSET_ROOT / source["path"]
    if source_path.stat().st_size != source["bytes"]:
        raise SystemExit("source byte size does not match manifest")
    if sha256(source_path) != source["sha256"]:
        raise SystemExit("source SHA-256 does not match manifest")

    listed_paths = set()
    for asset in manifest["assets"]:
        relative_path = asset["path"]
        if relative_path in listed_paths:
            raise SystemExit(f"duplicate manifest path: {relative_path}")
        listed_paths.add(relative_path)
        path = ASSET_ROOT / relative_path
        if not path.is_file():
            raise SystemExit(f"missing manifest asset: {relative_path}")
        if sha256(path) != asset["sha256"]:
            raise SystemExit(f"hash mismatch: {relative_path}")
        if asset["source_sha256"] != source["sha256"]:
            raise SystemExit(f"source mismatch: {relative_path}")
        if path.suffix.lower() == ".ico":
            with Image.open(path) as image:
                actual_sizes = sorted(image.info.get("sizes", []))
            expected_sizes = sorted(tuple(size) for size in asset["dimensions"])
            if actual_sizes != expected_sizes:
                raise SystemExit(f"ICO size mismatch: {relative_path}")
        else:
            with Image.open(path) as image:
                actual_dimensions = [image.width, image.height]
            if actual_dimensions != asset["dimensions"]:
                raise SystemExit(f"dimension mismatch: {relative_path}")

    image_files = {
        path.relative_to(ASSET_ROOT).as_posix()
        for path in ASSET_ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() in {".png", ".ico"}
    }
    if image_files != listed_paths:
        missing = sorted(listed_paths - image_files)
        orphaned = sorted(image_files - listed_paths)
        raise SystemExit(f"manifest image set differs; missing={missing}, orphaned={orphaned}")

    print(f"verified {len(listed_paths)} Mhoo assets")


if __name__ == "__main__":
    main()
