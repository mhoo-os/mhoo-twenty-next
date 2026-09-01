#!/usr/bin/env python3
"""Regression and hostile-mutation tests for the Mhoo residue gate."""

from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


SCRIPT_DIRECTORY = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIRECTORY))

import check_customer_brand_residue as gate  # noqa: E402


ROOT = SCRIPT_DIRECTORY.parents[1]
CUSTOMER_RULE = {
    "id": "test-customer-surface",
    "disposition": "customer-facing resolves Mhoo",
}


class CustomerBrandResidueTest(unittest.TestCase):
    def test_ledger_is_valid_and_receipt_is_deterministic(self) -> None:
        ledger, first_sha = gate.load_ledger(ROOT)
        self.assertEqual(ledger["version"], 1)
        first = gate.run_scan(ROOT)
        second = gate.run_scan(ROOT)
        self.assertEqual(first, second)
        self.assertEqual(first["ledgerSha256"], first_sha)
        self.assertEqual(first["counts"]["violations"], 0)

    def test_broad_rule_requires_scope_justification(self) -> None:
        ledger, _ = gate.load_ledger(ROOT)
        mutated = copy.deepcopy(ledger)
        mutated["pathRules"].append(
            {
                "id": "unbounded",
                "match": "packages/",
                "matchType": "prefix",
                "disposition": "customer-facing resolves Mhoo",
                "owner": "test",
                "reason": "test",
                "checks": ["residue"],
                "scan": True,
            }
        )
        with self.assertRaises(gate.LedgerError):
            gate.validate_ledger(mutated)

    def test_negative_source_fixtures_hit_their_named_rules(self) -> None:
        cases = {
            "hardcoded-mhoo-url.ts": "hardcoded-mhoo-url",
            "twenty-favicon.html": "twenty-favicon-residue",
            "direct-foundation-flag.ts": "direct-foundation-flag",
            "fake-dpa-link.ts": "fake-dpa-link",
            "unauthorized-license-edit.txt": "unauthorized-license-identity",
        }
        for filename, expected_rule in cases.items():
            with self.subTest(filename=filename):
                path = SCRIPT_DIRECTORY / "fixtures/negative" / filename
                text = path.read_text(encoding="utf-8")
                violations = gate.scan_text(path.as_posix(), text, CUSTOMER_RULE)
                self.assertIn(expected_rule, {item["ruleId"] for item in violations})

    def test_missing_asset_fixture_hits_asset_rule(self) -> None:
        path = SCRIPT_DIRECTORY / "fixtures/negative/missing-icon.json"
        violations = gate.scan_asset_references(
            path.as_posix(), path.read_text(encoding="utf-8"), ROOT
        )
        self.assertEqual({item["ruleId"] for item in violations}, {"missing-mhoo-asset"})

    def test_positive_technical_and_upstream_fixtures_are_allowed(self) -> None:
        technical = SCRIPT_DIRECTORY / "fixtures/positive/technical-identities.ts"
        upstream = SCRIPT_DIRECTORY / "fixtures/positive/upstream-attribution.html"
        self.assertEqual(
            gate.scan_text(technical.as_posix(), technical.read_text(encoding="utf-8"), CUSTOMER_RULE),
            [],
        )
        approved_rule = {
            "id": "test-approved-upstream",
            "disposition": "approved bounded “Powered by Twenty”",
        }
        self.assertEqual(
            gate.scan_text(upstream.as_posix(), upstream.read_text(encoding="utf-8"), approved_rule),
            [],
        )

    def test_receipt_stays_json_serializable_without_environmental_fields(self) -> None:
        receipt = gate.run_scan(ROOT)
        encoded = gate.canonical_json(receipt)
        self.assertNotIn("timestamp", encoded)
        self.assertIn('"schema":"mhoo.brand-residue-receipt.v1"', encoded)
        self.assertEqual(receipt["violations"], [])


if __name__ == "__main__":
    unittest.main()
