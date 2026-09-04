#!/usr/bin/env python3
"""Deterministic documentation-drift guard for Twenty app-development APIs.

The original check delegated this decision to an external coding agent. This
guard keeps the useful, reviewable part of that contract: substantive changes
to a public app-development surface must update a mapped English app-docs page
in the same pull request. Whitespace-only changes and tests are ignored.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import dataclass
from typing import Iterable, Sequence


DOC_ROOT = "packages/twenty-docs/developers/extend/apps/"

# These are product-shell implementation outputs, not extension contracts that
# an app author can consume. Their source-of-truth is verified elsewhere:
# AppPath is the host route registry, while metadata/generated is emitted by
# the server's canonical GraphQL generation step. Keeping them out of this
# app-docs guard avoids forcing unrelated app documentation changes.
NON_APP_EXTENSION_PATHS = frozenset(
    {
        "packages/twenty-shared/src/types/AppPath.ts",
    }
)
DERIVED_CLIENT_METADATA_PREFIX = "packages/twenty-client-sdk/src/metadata/generated/"


@dataclass(frozen=True)
class Rule:
    name: str
    prefixes: tuple[str, ...]
    exact_paths: tuple[str, ...]
    docs: tuple[str, ...]


RULES: tuple[Rule, ...] = (
    Rule(
        name="CLI commands and operations",
        prefixes=(
            "packages/twenty-sdk/src/cli/commands/",
            "packages/twenty-sdk/src/cli/operations/",
        ),
        exact_paths=(
            "packages/twenty-sdk/src/cli/cli.ts",
            "packages/twenty-sdk/src/cli/types.ts",
        ),
        docs=(
            "operations/cli.mdx",
            "getting-started/quick-start.mdx",
            "operations/sync-and-recovery.mdx",
            "getting-started/local-server.mdx",
            "getting-started/scaffolding.mdx",
        ),
    ),
    Rule(
        name="SDK definition and manifest contracts",
        prefixes=(
            "packages/twenty-sdk/src/sdk/define/",
            "packages/twenty-shared/src/application/",
            "packages/twenty-shared/src/types/",
        ),
        exact_paths=(),
        docs=(
            "data/objects.mdx",
            "data/extending-objects.mdx",
            "data/relations.mdx",
            "data/timeline-activity-types.mdx",
            "config/application.mdx",
            "config/roles.mdx",
            "config/install-hooks.mdx",
            "logic/logic-functions.mdx",
            "logic/connections.mdx",
            "logic/skills-and-agents.mdx",
            "layout/views.mdx",
            "layout/navigation-menu-items.mdx",
            "layout/command-menu-items.mdx",
            "layout/front-components.mdx",
        ),
    ),
    Rule(
        name="Front-component host API",
        prefixes=("packages/twenty-sdk/src/sdk/front-component/",),
        exact_paths=(),
        docs=("layout/front-components.mdx",),
    ),
    Rule(
        name="Logic-function and automation APIs",
        prefixes=("packages/twenty-sdk/src/sdk/logic-function/",),
        exact_paths=(),
        docs=(
            "logic/logic-functions.mdx",
            "logic/background-jobs.mdx",
            "logic/connections.mdx",
            "logic/key-value-store.mdx",
            "logic/skills-and-agents.mdx",
        ),
    ),
    Rule(
        name="Client SDK public surface",
        prefixes=("packages/twenty-client-sdk/src/",),
        exact_paths=(),
        docs=(
            "logic/logic-functions.mdx",
            "layout/front-components.mdx",
            "operations/cli.mdx",
        ),
    ),
    Rule(
        name="SDK public exports",
        prefixes=(),
        exact_paths=(
            "packages/twenty-sdk/package.json",
            "packages/twenty-client-sdk/package.json",
        ),
        docs=(
            "getting-started/project-structure.mdx",
            "operations/cli.mdx",
            "logic/logic-functions.mdx",
            "layout/front-components.mdx",
        ),
    ),
    Rule(
        name="SDK billing and utility public entry points",
        prefixes=(),
        exact_paths=(
            "packages/twenty-sdk/src/sdk/billing/index.ts",
            "packages/twenty-sdk/src/sdk/utils/index.ts",
        ),
        docs=(
            "config/public-assets.mdx",
            "logic/logic-functions.mdx",
        ),
    ),
    Rule(
        name="Front-component renderer public entry point",
        prefixes=(),
        exact_paths=(
            "packages/twenty-sdk/src/front-component-renderer/index.ts",
        ),
        docs=("layout/front-components.mdx",),
    ),
    Rule(
        name="App scaffolding",
        prefixes=(
            "packages/create-twenty-app/src/constants/template/",
            "packages/create-twenty-app/src/cli/",
        ),
        exact_paths=(
            "packages/create-twenty-app/src/cli.ts",
            "packages/create-twenty-app/src/create-app.command.ts",
        ),
        docs=(
            "getting-started/project-structure.mdx",
            "getting-started/quick-start.mdx",
            "getting-started/scaffolding.mdx",
            "operations/testing.mdx",
            "operations/publishing.mdx",
        ),
    ),
)


def path_matches_rule(path: str, rule: Rule) -> bool:
    return path in rule.exact_paths or any(
        path.startswith(prefix) for prefix in rule.prefixes
    )


def matching_rules(path: str) -> tuple[Rule, ...]:
    return tuple(rule for rule in RULES if path_matches_rule(path, rule))


def is_ignored_path(path: str) -> bool:
    """Return whether a changed path cannot change the documented API."""

    normalized = path.replace("\\", "/")
    lower = normalized.lower()
    return (
        normalized in NON_APP_EXTENSION_PATHS
        or normalized.startswith(DERIVED_CLIENT_METADATA_PREFIX)
        or "/__tests__/" in normalized
        or "/fixtures/" in normalized
        or lower.endswith((
            ".test.ts",
            ".test.tsx",
            ".test.js",
            ".test.jsx",
            ".spec.ts",
            ".spec.tsx",
            ".spec.js",
            ".spec.jsx",
            ".snap",
        ))
    )


def docs_path_from_changed_path(path: str) -> str | None:
    if not path.startswith(DOC_ROOT):
        return None
    relative = path[len(DOC_ROOT) :]
    if relative.startswith("l/") or not relative.endswith(".mdx"):
        return None
    return relative


def evaluate(
    substantive_paths: Iterable[str], docs_paths: Iterable[str]
) -> dict[str, object]:
    substantive = tuple(sorted(set(substantive_paths)))
    docs = set(docs_paths)
    impacts: list[dict[str, object]] = []

    for rule in RULES:
        source_paths = tuple(
            path for path in substantive if path_matches_rule(path, rule)
        )
        if not source_paths:
            continue

        matched_docs = tuple(sorted(set(rule.docs) & docs))
        needs_update = not matched_docs
        impacts.append(
            {
                "rule": rule.name,
                "sourcePaths": list(source_paths),
                "candidateDocs": list(rule.docs),
                "changedDocs": list(matched_docs),
                "needsUpdate": needs_update,
            }
        )

    has_drift = any(bool(impact["needsUpdate"]) for impact in impacts)
    if not impacts:
        summary = (
            "No substantive app-platform contract changes were detected; "
            "the documentation drift check is complete."
        )
    elif has_drift:
        count = sum(bool(impact["needsUpdate"]) for impact in impacts)
        summary = (
            f"{count} app-platform change group(s) have no matching English "
            "app-docs change in this pull request."
        )
    else:
        summary = (
            "Every detected app-platform change group has a matching English "
            "app-docs change in this pull request."
        )

    comment = ""
    if impacts:
        rows = [
            "| Change | Docs page | Status | Suggested fix |",
            "| --- | --- | --- | --- |",
        ]
        for impact in impacts:
            source = ", ".join(f"`{path}`" for path in impact["sourcePaths"])
            if impact["needsUpdate"]:
                docs_label = ", ".join(
                    f"`{DOC_ROOT}{path}`" for path in impact["candidateDocs"]
                )
                status = "⚠️ needs update"
                suggestion = (
                    "Update one of the mapped English pages and verify it "
                    "against the changed public contract."
                )
            else:
                docs_label = ", ".join(
                    f"`{DOC_ROOT}{path}`" for path in impact["changedDocs"]
                )
                status = "✅ already updated in this PR"
                suggestion = (
                    "Review the mapped page against the changed public contract."
                )
            rows.append(
                f"| {source} | {docs_label} | {status} | {suggestion} |"
            )
        comment = "\n".join(
            [
                "<!-- app-docs-drift-check -->",
                "",
                "### App docs drift check",
                "",
                *rows,
            ]
        )

    return {
        "hasDrift": has_drift,
        "commentNeeded": bool(impacts),
        "summary": summary,
        "comment": comment,
        "impacts": impacts,
    }


def run_git(args: Sequence[str]) -> bytes:
    completed = subprocess.run(
        ["git", *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    return completed.stdout


def changed_paths(base: str, head: str) -> tuple[str, ...]:
    output = run_git(["diff", "--name-only", "-z", f"{base}...{head}"])
    return tuple(
        path.decode("utf-8") for path in output.split(b"\0") if path
    )


def has_substantive_diff(base: str, head: str, path: str) -> bool:
    completed = subprocess.run(
        [
            "git",
            "diff",
            "--quiet",
            "--ignore-all-space",
            "--ignore-blank-lines",
            f"{base}...{head}",
            "--",
            path,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    if completed.returncode == 0:
        return False
    if completed.returncode == 1:
        return True
    raise RuntimeError(completed.stderr.decode("utf-8", errors="replace"))


def inspect_repository(base: str, head: str) -> dict[str, object]:
    paths = changed_paths(base, head)
    relevant_paths = {
        path
        for path in paths
        if matching_rules(path) and not is_ignored_path(path)
    }
    substantive = tuple(
        sorted(
            path
            for path in relevant_paths
            if has_substantive_diff(base, head, path)
        )
    )
    docs = tuple(
        sorted(
            relative
            for path in paths
            if (relative := docs_path_from_changed_path(path)) is not None
            and has_substantive_diff(base, head, path)
        )
    )
    result = evaluate(substantive, docs)
    result["changedPaths"] = list(paths)
    result["substantivePaths"] = list(substantive)
    result["changedDocs"] = list(docs)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = inspect_repository(args.base, args.head)
    if args.json:
        print(json.dumps(result, sort_keys=True))
    else:
        print(result["summary"])
        if result["comment"]:
            print(result["comment"])
    # JSON mode is consumed by the workflow, which must still publish the
    # structured comment before the separate gate step fails on true drift.
    return 0 if args.json or not result["hasDrift"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
