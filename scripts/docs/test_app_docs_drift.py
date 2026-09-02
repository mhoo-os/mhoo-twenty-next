#!/usr/bin/env python3

import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent))

from check_app_docs_drift import evaluate, is_ignored_path, matching_rules


class AppDocsDriftTests(unittest.TestCase):
    def test_no_substantive_paths_pass_without_a_comment(self) -> None:
        result = evaluate([], [])

        self.assertFalse(result["hasDrift"])
        self.assertFalse(result["commentNeeded"])

    def test_public_client_change_without_docs_is_drift(self) -> None:
        result = evaluate(
            ["packages/twenty-client-sdk/src/metadata/generated/types.ts"], []
        )

        self.assertTrue(result["hasDrift"])
        self.assertTrue(result["commentNeeded"])
        self.assertEqual(len(result["impacts"]), 1)
        self.assertTrue(result["impacts"][0]["needsUpdate"])

    def test_public_client_change_with_mapped_docs_passes(self) -> None:
        result = evaluate(
            ["packages/twenty-client-sdk/src/metadata/generated/types.ts"],
            ["logic/logic-functions.mdx"],
        )

        self.assertFalse(result["hasDrift"])
        self.assertTrue(result["commentNeeded"])
        self.assertEqual(
            result["impacts"][0]["changedDocs"], ["logic/logic-functions.mdx"]
        )

    def test_tests_are_ignored(self) -> None:
        path = "packages/twenty-sdk/src/sdk/define/objects/__tests__/objects.test.ts"

        self.assertTrue(is_ignored_path(path))
        self.assertTrue(matching_rules(path))

    def test_whitespace_only_diff_is_represented_by_empty_substantive_input(self) -> None:
        result = evaluate(
            [], ["logic/logic-functions.mdx"]
        )

        self.assertFalse(result["hasDrift"])
        self.assertFalse(result["commentNeeded"])


if __name__ == "__main__":
    unittest.main()
