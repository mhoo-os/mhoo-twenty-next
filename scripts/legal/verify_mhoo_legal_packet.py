#!/usr/bin/env python3
"""Verify the approved Mhoo Legal Packet v2.0 without network access."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


PACKET_DIRECTORY = Path("docs/legal/mhoo/v2.0")
MANIFEST_NAME = "mhoo-legal-packet-manifest-v2.0.json"
MANIFEST_SHA256 = "57ffc6de05f1deb3c8db7b05fd9a1b7a09f7c8bc2996e1e859fbd2238ca227f5"
EXPECTED_ROUTES = {
    "/legal/acceptable-use",
    "/legal/dpa",
    "/legal/open-source",
    "/legal/privacy",
    "/legal/terms",
}
ROUTE_PATTERN = re.compile(r"^\*\*Canonical Route:\*\* `([^`]+)`$", re.MULTILINE)


class VerificationError(RuntimeError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_canonical_text(path: Path, data: bytes) -> str:
    if data.startswith(b"\xef\xbb\xbf"):
        raise VerificationError(f"{path.name}: UTF-8 BOM is not canonical")
    if b"\r" in data:
        raise VerificationError(f"{path.name}: line endings must be LF")
    if not data.endswith(b"\n") or data.endswith(b"\n\n"):
        raise VerificationError(
            f"{path.name}: exactly one terminal newline is required",
        )

    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise VerificationError(f"{path.name}: content must be UTF-8") from error


def verify_packet(repository_root: Path) -> dict[str, object]:
    packet_directory = repository_root / PACKET_DIRECTORY
    manifest_path = packet_directory / MANIFEST_NAME

    if not manifest_path.is_file():
        raise VerificationError(f"missing manifest: {manifest_path}")

    manifest_bytes = manifest_path.read_bytes()
    manifest_digest = sha256(manifest_bytes)
    if manifest_digest != MANIFEST_SHA256:
        raise VerificationError(
            f"manifest hash mismatch: expected {MANIFEST_SHA256}, got {manifest_digest}",
        )

    manifest = json.loads(manifest_bytes)
    expected_metadata = {
        "schema": "mhoo-legal-packet-manifest/v1",
        "packet_id": "MHOO-LEGAL-2026-v2.0",
        "packet_version": "2.0",
        "status": "APPROVED_FINAL",
        "contracting_entity": "Mhoo LLC",
        "dpa_state": "UNAVAILABLE_FAIL_CLOSED",
        "effective_date": "2026-09-02",
        "approval_timestamp": "2026-09-02T20:43:58Z",
        "approver": "Tanyawit Nilnavarat",
    }
    for key, expected in expected_metadata.items():
        if manifest.get(key) != expected:
            raise VerificationError(
                f"manifest {key} mismatch: expected {expected!r}, got {manifest.get(key)!r}",
            )

    listed_files = manifest.get("files")
    if not isinstance(listed_files, list) or len(listed_files) != 6:
        raise VerificationError("manifest must list exactly six governed source files")

    receipts: list[dict[str, object]] = []
    routes: set[str] = set()
    for entry in listed_files:
        if not isinstance(entry, dict):
            raise VerificationError("manifest file entry must be an object")
        relative_path = entry.get("path")
        if not isinstance(relative_path, str) or Path(relative_path).name != relative_path:
            raise VerificationError(f"unsafe manifest path: {relative_path!r}")

        path = packet_directory / relative_path
        if not path.is_file():
            raise VerificationError(f"missing governed source: {relative_path}")
        data = path.read_bytes()
        text = verify_canonical_text(path, data)
        actual_digest = sha256(data)
        actual_bytes = len(data)
        if actual_digest != entry.get("sha256"):
            raise VerificationError(
                f"{relative_path}: hash mismatch: expected {entry.get('sha256')}, got {actual_digest}",
            )
        if actual_bytes != entry.get("bytes"):
            raise VerificationError(
                f"{relative_path}: byte count mismatch: expected {entry.get('bytes')}, got {actual_bytes}",
            )

        route_match = ROUTE_PATTERN.search(text)
        if route_match:
            routes.add(route_match.group(1))
        receipts.append(
            {"path": relative_path, "sha256": actual_digest, "bytes": actual_bytes},
        )

    if routes != EXPECTED_ROUTES:
        raise VerificationError(
            f"canonical route set mismatch: expected {sorted(EXPECTED_ROUTES)}, got {sorted(routes)}",
        )

    actual_names = {path.name for path in packet_directory.iterdir() if path.is_file()}
    expected_names = {MANIFEST_NAME, *(entry["path"] for entry in listed_files)}
    if actual_names != expected_names:
        raise VerificationError(
            f"governed directory file set mismatch: expected {sorted(expected_names)}, got {sorted(actual_names)}",
        )

    return {
        "packetId": manifest["packet_id"],
        "status": manifest["status"],
        "manifestSha256": manifest_digest,
        "dpaState": manifest["dpa_state"],
        "routes": sorted(routes),
        "files": receipts,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    try:
        receipt = verify_packet(args.root.resolve())
    except (OSError, json.JSONDecodeError, VerificationError) as error:
        print(f"MHO-226 legal packet verification failed: {error}")
        return 1

    if args.json:
        print(json.dumps(receipt, indent=2, sort_keys=True))
    else:
        print("MHO-226 legal packet verification passed")
        print(f"packet_id={receipt['packetId']}")
        print(f"manifest_sha256={receipt['manifestSha256']}")
        print(f"routes={','.join(receipt['routes'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
