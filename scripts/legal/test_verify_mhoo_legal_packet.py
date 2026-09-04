#!/usr/bin/env python3

from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from scripts.legal.verify_mhoo_legal_packet import (
    MANIFEST_NAME,
    PACKET_DIRECTORY,
    VerificationError,
    verify_packet,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


class VerifyMhooLegalPacketTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        target = self.root / PACKET_DIRECTORY
        target.parent.mkdir(parents=True)
        shutil.copytree(REPOSITORY_ROOT / PACKET_DIRECTORY, target)

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_accepts_exact_approved_packet(self) -> None:
        receipt = verify_packet(self.root)

        self.assertEqual(receipt["packetId"], "MHOO-LEGAL-2026-v2.0")
        self.assertEqual(receipt["dpaState"], "UNAVAILABLE_FAIL_CLOSED")
        self.assertEqual(len(receipt["routes"]), 5)
        self.assertEqual(len(receipt["files"]), 6)

    def test_rejects_altered_legal_text(self) -> None:
        path = self.root / PACKET_DIRECTORY / "01-mhoo-master-terms-v2.0.md"
        path.write_text(path.read_text(encoding="utf-8") + "altered\n", encoding="utf-8")

        with self.assertRaisesRegex(VerificationError, "hash mismatch"):
            verify_packet(self.root)

    def test_rejects_missing_source(self) -> None:
        (self.root / PACKET_DIRECTORY / "02-mhoo-privacy-policy-v2.0.md").unlink()

        with self.assertRaisesRegex(VerificationError, "missing governed source"):
            verify_packet(self.root)

    def test_rejects_non_canonical_line_endings(self) -> None:
        path = self.root / PACKET_DIRECTORY / "03-mhoo-acceptable-use-policy-v2.0.md"
        path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))

        with self.assertRaisesRegex(VerificationError, "line endings must be LF"):
            verify_packet(self.root)

    def test_rejects_an_unapproved_manifest_replacement(self) -> None:
        path = self.root / PACKET_DIRECTORY / MANIFEST_NAME
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["status"] = "DRAFT_UNAPPROVED"
        path.write_text(json.dumps(manifest), encoding="utf-8")

        with self.assertRaisesRegex(VerificationError, "manifest hash mismatch"):
            verify_packet(self.root)


if __name__ == "__main__":
    unittest.main()
