#!/usr/bin/env python3

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent))

from check_app_docs_drift import (
    evaluate,
    inspect_repository,
    is_ignored_path,
    matching_rules,
)


class AppDocsDriftTests(unittest.TestCase):
    def test_fork_prs_run_the_verdict_without_requiring_comment_permission(self) -> None:
        repository_root = Path(__file__).resolve().parents[2]
        workflow = (
            repository_root / ".github/workflows/ci-app-docs-drift.yaml"
        ).read_text()
        publication_step = workflow.split("- name: Post docs drift comment", 1)[1].split(
            "- name: Gate on drift verdict", 1
        )[0]
        gate_step = workflow.split("- name: Gate on drift verdict", 1)[1]

        self.assertIn(
            "github.event.pull_request.head.repo.full_name == github.repository",
            publication_step,
        )
        self.assertIn("CAN_PUBLISH_COMMENT", gate_step)
        self.assertIn('"$CAN_PUBLISH_COMMENT" = "true"', gate_step)

    def test_no_substantive_paths_pass_without_a_comment(self) -> None:
        result = evaluate([], [])

        self.assertFalse(result["hasDrift"])
        self.assertFalse(result["commentNeeded"])

    def test_public_client_source_change_without_docs_is_drift(self) -> None:
        result = evaluate(
            ["packages/twenty-client-sdk/src/rest/index.ts"], []
        )

        self.assertTrue(result["hasDrift"])
        self.assertTrue(result["commentNeeded"])
        self.assertEqual(len(result["impacts"]), 1)
        self.assertTrue(result["impacts"][0]["needsUpdate"])

    def test_public_client_source_change_with_mapped_docs_passes(self) -> None:
        result = evaluate(
            ["packages/twenty-client-sdk/src/rest/index.ts"],
            ["logic/logic-functions.mdx"],
        )

        self.assertFalse(result["hasDrift"])
        self.assertTrue(result["commentNeeded"])
        self.assertEqual(
            result["impacts"][0]["changedDocs"], ["logic/logic-functions.mdx"]
        )

    def test_sdk_billing_and_utility_entry_points_require_mapped_docs(self) -> None:
        result = evaluate(
            [
                "packages/twenty-sdk/src/sdk/billing/index.ts",
                "packages/twenty-sdk/src/sdk/utils/index.ts",
            ],
            [],
        )

        self.assertTrue(result["hasDrift"])
        self.assertEqual(len(result["impacts"]), 1)
        self.assertEqual(
            result["impacts"][0]["rule"],
            "SDK billing and utility public entry points",
        )

    def test_front_component_renderer_entry_point_requires_docs(self) -> None:
        result = evaluate(
            ["packages/twenty-sdk/src/front-component-renderer/index.ts"], []
        )

        self.assertTrue(result["hasDrift"])
        self.assertEqual(
            result["impacts"][0]["rule"],
            "Front-component renderer public entry point",
        )

    def test_tests_are_ignored(self) -> None:
        path = "packages/twenty-sdk/src/sdk/define/objects/__tests__/objects.test.ts"

        self.assertTrue(is_ignored_path(path))
        self.assertTrue(matching_rules(path))

    def test_product_route_registry_and_derived_metadata_are_ignored(self) -> None:
        self.assertTrue(
            is_ignored_path("packages/twenty-shared/src/types/AppPath.ts")
        )
        self.assertTrue(
            is_ignored_path(
                "packages/twenty-client-sdk/src/metadata/generated/types.ts"
            )
        )
        self.assertTrue(
            matching_rules("packages/twenty-shared/src/types/AppPath.ts")
        )
        self.assertTrue(
            matching_rules(
                "packages/twenty-client-sdk/src/metadata/generated/types.ts"
            )
        )

    def test_whitespace_only_diff_is_represented_by_empty_substantive_input(self) -> None:
        result = evaluate(
            [], ["logic/logic-functions.mdx"]
        )

        self.assertFalse(result["hasDrift"])
        self.assertFalse(result["commentNeeded"])

    def test_whitespace_only_mapped_doc_does_not_clear_real_api_drift(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            repo = Path(temporary_directory)

            def git(*args: str) -> None:
                subprocess.run(
                    ["git", *args],
                    cwd=repo,
                    check=True,
                    stdout=subprocess.DEVNULL,
                )

            source_path = repo / "packages/twenty-sdk/src/sdk/utils/index.ts"
            doc_path = (
                repo
                / "packages/twenty-docs/developers/extend/apps/logic/logic-functions.mdx"
            )
            source_path.parent.mkdir(parents=True)
            doc_path.parent.mkdir(parents=True)
            source_path.write_text("export const value = 'before';\n")
            doc_path.write_text("# Runtime helpers\n")

            git("init")
            git("config", "user.name", "App Docs Drift Test")
            git("config", "user.email", "app-docs-drift@example.test")
            git("add", ".")
            git("commit", "-m", "base fixture")
            base = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=repo, text=True
            ).strip()

            source_path.write_text("export const value = 'after';\n")
            doc_path.write_text("# Runtime helpers\n\n")
            git("add", ".")
            git("commit", "-m", "api change with whitespace doc change")

            previous_directory = os.getcwd()
            try:
                os.chdir(repo)
                result = inspect_repository(base, "HEAD")
            finally:
                os.chdir(previous_directory)

        self.assertTrue(result["hasDrift"])
        self.assertEqual(result["changedDocs"], [])


if __name__ == "__main__":
    unittest.main()
