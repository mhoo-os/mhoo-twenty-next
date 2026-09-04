#!/usr/bin/env python3
"""Run the deterministic Mhoo customer-brand residue gate.

The gate is deliberately path- and context-aware.  Twenty is still a valid
technical and provenance identity in this repository; only customer-facing
paths are checked for an ungoverned identity or resolver bypass.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
LEDGER_RELATIVE_PATH = "docs/provenance/brand-touchpoint-ledger.json"
ALLOWED_DISPOSITIONS = {
    "customer-facing resolves Mhoo",
    "generic brand consumer canonical contract/resolver",
    "retained technical identity + reason",
    "retained legal/provenance identity + reason",
    "approved bounded “Powered by Twenty”",
    "test fixture explicitly exercising upstream fallback",
}

DIRECT_FLAG_PATTERN = re.compile(
    r"(?:IS_MHOO_FOUNDATION_ENABLED|isMhooFoundationEnabled)"
)
MHO_URL_PATTERN = re.compile(r"https?://[^\s\"'`<>)]*mhoo[^\s\"'`<>)]*", re.I)
UPSTREAM_WEB_URL_PATTERN = re.compile(
    r"https?://(?:www\.|docs\.|status\.)?twenty\.com\b", re.I
)
TWENTY_FAVICON_PATTERN = re.compile(
    r"/images/(?:icons|twenty)[^\"'`\s<>]*(?:favicon|icon)[^\"'`\s<>]*",
    re.I,
)
QUOTED_TWENTY_PATTERN = re.compile(r"([\"'`])[^\n\"'`]*\bTwenty\b[^\n\"'`]*\1")
DUPLICATE_BRAND_OBJECT_PATTERN = re.compile(
    r"\b(?:const|let|var)\s+[A-Za-z_$][\w$]*(?:brand|productBrand|mhooBrand|twentyBrand)\w*\s*[:=]\s*\{",
    re.I,
)
FAKE_DPA_PATTERN = re.compile(
    r"\bdpa\b[\s\S]{0,300}?status\s*[:=]\s*['\"]unavailable['\"][\s\S]{0,300}?url\s*[:=]\s*['\"]https?://",
    re.I,
)
UNAUTHORIZED_LICENSE_PATTERN = re.compile(
    r"\b(?:license|licence)\s*[:=]\s*[\"']?proprietary\b", re.I
)


class LedgerError(ValueError):
    """Raised when the machine-readable custody ledger is malformed."""


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def validate_ledger(ledger: dict[str, Any]) -> dict[str, Any]:
    if ledger.get("schema") != "mhoo.brand-touchpoint-ledger.v1":
        raise LedgerError("unsupported brand touchpoint ledger schema")
    if ledger.get("version") != 1:
        raise LedgerError("unsupported brand touchpoint ledger version")

    dispositions = ledger.get("dispositions")
    if not isinstance(dispositions, list):
        raise LedgerError("dispositions must be a list")
    if set(dispositions or []) != ALLOWED_DISPOSITIONS:
        raise LedgerError("ledger dispositions do not match the governed set")

    path_rules = ledger.get("pathRules")
    if not isinstance(path_rules, list) or not path_rules:
        raise LedgerError("pathRules must be a non-empty list")
    rule_ids: set[str] = set()
    rule_matches: set[tuple[str, str]] = set()
    for rule in path_rules:
        for field in ("id", "match", "matchType", "disposition", "owner", "reason", "checks"):
            if not rule.get(field):
                raise LedgerError(f"path rule is missing {field}")
        if rule["id"] in rule_ids:
            raise LedgerError(f"duplicate path rule id: {rule['id']}")
        rule_ids.add(rule["id"])
        match_key = (rule["matchType"], rule["match"])
        if match_key in rule_matches:
            raise LedgerError(f"duplicate path rule match: {rule['match']}")
        rule_matches.add(match_key)
        if rule["disposition"] not in ALLOWED_DISPOSITIONS:
            raise LedgerError(f"unsupported disposition: {rule['disposition']}")
        if rule["matchType"] not in {"exact", "prefix"}:
            raise LedgerError(f"unsupported match type: {rule['matchType']}")
        if rule["matchType"] == "prefix" and not rule["match"].endswith("/"):
            raise LedgerError(f"prefix rule must end with '/': {rule['match']}")
        if ("**" in rule["match"] or rule["match"].endswith("/")) and not rule.get(
            "scopeJustification"
        ):
            raise LedgerError(f"broad path rule has no scopeJustification: {rule['match']}")
        if not isinstance(rule["checks"], list) or not rule["checks"]:
            raise LedgerError(f"path rule has no checks: {rule['id']}")

    marker_checks = ledger.get("markerChecks")
    if not isinstance(marker_checks, list) or not marker_checks:
        raise LedgerError("markerChecks must be a non-empty list")
    marker_ids: set[str] = set()
    for check in marker_checks:
        for field in ("id", "path", "owner", "reason", "markers"):
            if not check.get(field):
                raise LedgerError(f"marker check is missing {field}")
        if check["id"] in marker_ids:
            raise LedgerError(f"duplicate marker check id: {check['id']}")
        marker_ids.add(check["id"])
        if not isinstance(check["markers"], list) or not all(check["markers"]):
            raise LedgerError(f"marker check has no markers: {check['id']}")

    artifacts = ledger.get("artifactFixtures")
    if not isinstance(artifacts, list) or not artifacts:
        raise LedgerError("artifactFixtures must be a non-empty list")
    artifact_ids: set[str] = set()
    for artifact in artifacts:
        for field in ("id", "preset", "kind", "path", "requiredTokens", "forbiddenTokens"):
            if field not in artifact:
                raise LedgerError(f"artifact fixture is missing {field}")
        if artifact["id"] in artifact_ids:
            raise LedgerError(f"duplicate artifact fixture id: {artifact['id']}")
        artifact_ids.add(artifact["id"])
        if artifact["preset"] not in {"mhoo", "twenty"}:
            raise LedgerError(f"unsupported artifact preset: {artifact['id']}")
    return ledger


def load_ledger(root: Path = ROOT) -> tuple[dict[str, Any], str]:
    path = root / LEDGER_RELATIVE_PATH
    try:
        ledger = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise LedgerError(f"missing ledger: {LEDGER_RELATIVE_PATH}") from exc
    except json.JSONDecodeError as exc:
        raise LedgerError(f"ledger is not valid JSON: {exc}") from exc
    validate_ledger(ledger)
    return ledger, sha256_text(canonical_json(ledger))


def path_matches(rule: dict[str, Any], relative_path: str) -> bool:
    if rule["matchType"] == "exact":
        return relative_path == rule["match"]
    return relative_path.startswith(rule["match"])


def rule_for_path(ledger: dict[str, Any], relative_path: str) -> dict[str, Any] | None:
    matches = [rule for rule in ledger["pathRules"] if path_matches(rule, relative_path)]
    if not matches:
        return None
    return max(matches, key=lambda rule: len(rule["match"]))


def git_files(root: Path) -> list[str]:
    completed = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=root,
        check=False,
        capture_output=True,
    )
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise LedgerError(f"cannot enumerate source files: {detail}")
    paths = [item for item in completed.stdout.decode("utf-8").split("\0") if item]
    if not paths:
        raise LedgerError("source file enumeration returned no files")
    return paths


def source_candidates(root: Path, ledger: dict[str, Any]) -> list[str]:
    candidates = {
        path
        for path in git_files(root)
        if (rule := rule_for_path(ledger, path)) and rule.get("scan") is True
    }
    # Include staged or newly-created files before they are in the index.  The
    # ledger remains the allowlist; this only makes the local gate fail closed
    # during development instead of silently skipping a new source file.
    for rule in ledger["pathRules"]:
        if rule.get("scan") is not True:
            continue
        if rule["matchType"] == "exact":
            candidate = root / rule["match"]
            if candidate.is_file():
                candidates.add(rule["match"])
            continue
        base = root / rule["match"]
        if base.is_dir():
            candidates.update(
                path.relative_to(root).as_posix()
                for path in base.rglob("*")
                if path.is_file()
            )
    return sorted(candidates)


def is_fixture_or_test(relative_path: str) -> bool:
    return (
        relative_path.startswith("scripts/branding/fixtures/")
        or "/__tests__/" in relative_path
        or relative_path.endswith((".spec.ts", ".spec.tsx", ".test.ts", ".test.tsx"))
    )


def customer_disposition(disposition: str) -> bool:
    return disposition in {
        "customer-facing resolves Mhoo",
        "generic brand consumer canonical contract/resolver",
    }


def upstream_context(line: str) -> bool:
    lowered = line.casefold()
    return any(
        marker in lowered
        for marker in (
            "upstream",
            "provenance",
            "technical",
            "license",
            "twenty_",
            "twentyconfig",
            "twenty-shared",
            "github.com/twentyhq",
            "brand.preset",
            "attribution",
        )
    )


def make_violation(
    relative_path: str,
    line_number: int,
    rule_id: str,
    detected: str,
    expected: str,
    remediation: str,
) -> dict[str, Any]:
    return {
        "path": relative_path,
        "line": line_number,
        "ruleId": rule_id,
        "detected": detected,
        "expected": expected,
        "remediation": remediation,
    }


def line_number_for(text: str, offset: int) -> int:
    return text.count("\n", 0, max(0, offset)) + 1


def scan_text(
    relative_path: str,
    text: str,
    rule: dict[str, Any],
    *,
    skip_fixture_checks: bool = False,
) -> list[dict[str, Any]]:
    """Scan one source/fixture text and return structured violations.

    This function is intentionally public so hostile mutation tests can feed
    each detector a small controlled fixture without changing the repository.
    """

    if skip_fixture_checks or not customer_disposition(rule["disposition"]):
        return []

    violations: list[dict[str, Any]] = []
    lines = text.splitlines()
    for line_number, line in enumerate(lines, start=1):
        if DIRECT_FLAG_PATTERN.search(line) and not upstream_context(line):
            violations.append(
                make_violation(
                    relative_path,
                    line_number,
                    "direct-foundation-flag",
                    DIRECT_FLAG_PATTERN.search(line).group(0),
                    "resolve the ProductBrand contract through the canonical resolver",
                    "remove the direct foundation flag and consume the shared brand contract",
                )
            )
        mhoo_match = MHO_URL_PATTERN.search(line)
        if mhoo_match:
            violations.append(
                make_violation(
                    relative_path,
                    line_number,
                    "hardcoded-mhoo-url",
                    mhoo_match.group(0),
                    "Mhoo URLs come from the resolved brand contract",
                    "replace the literal URL with the approved brand URL adapter",
                )
            )
        favicon_match = TWENTY_FAVICON_PATTERN.search(line)
        if favicon_match:
            violations.append(
                make_violation(
                    relative_path,
                    line_number,
                    "twenty-favicon-residue",
                    favicon_match.group(0),
                    "the Mhoo asset family for the Mhoo preset",
                    "resolve the favicon through the brand asset contract",
                )
            )
        if UPSTREAM_WEB_URL_PATTERN.search(line) and not upstream_context(line):
            violations.append(
                make_violation(
                    relative_path,
                    line_number,
                    "raw-upstream-customer-url",
                    UPSTREAM_WEB_URL_PATTERN.search(line).group(0),
                    "an approved brand URL or an explicitly framed upstream destination",
                    "use the resolved brand URL; retain an upstream URL only with explicit provenance context",
                )
            )
        quoted_match = QUOTED_TWENTY_PATTERN.search(line)
        if quoted_match and not upstream_context(line):
            violations.append(
                make_violation(
                    relative_path,
                    line_number,
                    "unclassified-upstream-customer-identity",
                    quoted_match.group(0),
                    "customer-visible identity from the ProductBrand contract",
                    "replace the literal upstream identity with the resolved product brand",
                )
            )
        duplicate_match = DUPLICATE_BRAND_OBJECT_PATTERN.search(line)
        if duplicate_match:
            violations.append(
                make_violation(
                    relative_path,
                    line_number,
                    "duplicate-brand-object",
                    duplicate_match.group(0),
                    "the shared canonical brand preset/resolver",
                    "remove the package-local brand object and consume twenty-shared/branding",
                )
            )

    fake_dpa_match = FAKE_DPA_PATTERN.search(text)
    if fake_dpa_match:
        violations.append(
            make_violation(
                relative_path,
                line_number_for(text, fake_dpa_match.start()),
                "fake-dpa-link",
                fake_dpa_match.group(0).replace("\n", " ")[:240],
                "unavailable DPA means url: null until publication approval",
                "keep the legal link null and render the unavailable state",
            )
        )

    unauthorized_license_match = UNAUTHORIZED_LICENSE_PATTERN.search(text)
    if unauthorized_license_match:
        violations.append(
            make_violation(
                relative_path,
                line_number_for(text, unauthorized_license_match.start()),
                "unauthorized-license-identity",
                unauthorized_license_match.group(0),
                "the custodied upstream license/provenance identity",
                "restore the governed license marker and record any change through the accepted custody process",
            )
        )
    return violations


def scan_source(root: Path, ledger: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    violations: list[dict[str, Any]] = []
    candidates = source_candidates(root, ledger)
    for relative_path in candidates:
        rule = rule_for_path(ledger, relative_path)
        if rule is None:
            violations.append(
                make_violation(
                    relative_path,
                    1,
                    "unclassified-path",
                    relative_path,
                    "a ledger path disposition",
                    "add a narrow owner, reason, scope justification, and check to the touchpoint ledger",
                )
            )
            continue
        path = root / relative_path
        data = path.read_bytes()
        if b"\0" in data:
            continue
        text = data.decode("utf-8", errors="replace")
        if is_fixture_or_test(relative_path):
            continue
        violations.extend(scan_text(relative_path, text, rule))
    return violations, len(candidates)


def scan_asset_references(
    relative_path: str, text: str, root: Path = ROOT
) -> list[dict[str, Any]]:
    """Verify that every Mhoo asset URL in a rendered artifact exists."""

    violations: list[dict[str, Any]] = []
    for match in re.finditer(r"/images/mhoo/([^\"'`\s<>]+)", text):
        asset_path = root / "packages/twenty-front/public/images/mhoo" / match.group(1)
        if not asset_path.is_file():
            violations.append(
                make_violation(
                    relative_path,
                    line_number_for(text, match.start()),
                    "missing-mhoo-asset",
                    match.group(0),
                    "every referenced Mhoo asset exists in the custodied family",
                    "restore the asset or correct the rendered artifact path",
                )
            )
    return violations


def contract_violation(path: str, detected: str, expected: str) -> dict[str, Any]:
    return make_violation(
        path,
        1,
        "brand-contract-regression",
        detected,
        expected,
        "restore the governed shared brand contract and its fail-closed legal behavior",
    )


def scan_contract(root: Path) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    preset_path = root / "packages/twenty-shared/src/branding/brand-presets.ts"
    if not preset_path.is_file():
        return [contract_violation(preset_path.as_posix(), "missing", "canonical brand presets")]
    text = preset_path.read_text(encoding="utf-8")
    mhoo_match = re.search(r"const mhooBrand: ProductBrand = \{(.*?)\n\};\n\nconst twentyBrand", text, re.S)
    twenty_match = re.search(r"const twentyBrand: ProductBrand = \{(.*?)\n\};\n\nconst deepFreeze", text, re.S)
    if not mhoo_match:
        violations.append(contract_violation(preset_path.as_posix(), "missing mhooBrand block", "Mhoo preset block"))
        mhoo_block = ""
    else:
        mhoo_block = mhoo_match.group(1)
    if not twenty_match:
        violations.append(contract_violation(preset_path.as_posix(), "missing twentyBrand block", "Twenty fallback preset block"))
        twenty_block = ""
    else:
        twenty_block = twenty_match.group(1)

    required_mhoo_patterns = (
        r"legalEntity: 'Mhoo LLC'",
        r"legalEntityStatus: 'approved'",
        r"privacy:\s*\{\s*status: 'approved',\s*url: '/legal/privacy'\s*\}",
        r"terms:\s*\{\s*status: 'approved',\s*url: '/legal/terms'\s*\}",
        r"acceptableUse:\s*\{\s*status: 'approved',\s*url: '/legal/acceptable-use'\s*\}",
        r"openSource:\s*\{\s*status: 'approved',\s*url: '/legal/open-source'\s*\}",
        r"dpa:\s*\{\s*status: 'unavailable',\s*url: null\s*\}",
        r"dpaAvailabilityNotice:\s*\{\s*status: 'approved',\s*url: '/legal/dpa'\s*\}",
    )
    for pattern in required_mhoo_patterns:
        if not re.search(pattern, mhoo_block, re.S):
            violations.append(contract_violation(preset_path.as_posix(), pattern, "approved Mhoo packet with fail-closed DPA state"))
    if re.search(r"https?://", mhoo_block):
        violations.append(contract_violation(preset_path.as_posix(), "absolute URL in Mhoo preset", "origin-neutral relative Mhoo URLs"))
    for pattern in (r"preset: 'twenty'", r"https://twenty\.com/", r"status: 'approved'"):
        if not re.search(pattern, twenty_block):
            violations.append(contract_violation(preset_path.as_posix(), pattern, "explicit upstream fallback preset"))

    public_brand_path = root / "packages/twenty-server/src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type.ts"
    if public_brand_path.is_file():
        public_text = public_brand_path.read_text(encoding="utf-8")
        for marker in ("isApprovedDocument", "status === 'approved'", "unavailableLegalDocuments"):
            if marker not in public_text:
                violations.append(contract_violation(public_brand_path.as_posix(), f"missing {marker}", "approved-only public-page projection"))
    else:
        violations.append(contract_violation(public_brand_path.as_posix(), "missing", "public-page brand projection"))

    resolver_path = root / "packages/twenty-server/src/engine/core-modules/twenty-config/services/product-brand-resolver.service.ts"
    if not resolver_path.is_file() or "resolveProductBrand" not in resolver_path.read_text(encoding="utf-8"):
        violations.append(contract_violation(resolver_path.as_posix(), "missing resolver", "canonical ProductBrand resolver"))

    for relative_path in (
        "packages/twenty-front/src/pages/settings/legal/SettingsLegalDpa.tsx",
        "packages/twenty-front/src/pages/settings/legal/SettingsLegalDpaNew.tsx",
    ):
        path = root / relative_path
        if not path.is_file() or "brand.legal.dpa.status === 'approved'" not in path.read_text(encoding="utf-8"):
            violations.append(contract_violation(relative_path, "missing approved DPA gate", "DPA query/action gated by approved brand status"))
    return violations


def scan_markers(root: Path, ledger: dict[str, Any]) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    for check in ledger["markerChecks"]:
        path = root / check["path"]
        if not path.is_file():
            violations.append(
                make_violation(check["path"], 1, "required-marker-missing", "file missing", "; ".join(check["markers"]), f"restore {check['owner']} custody: {check['reason']}")
            )
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for marker in check["markers"]:
            if marker not in text:
                violations.append(
                    make_violation(check["path"], 1, "required-marker-missing", marker, marker, f"restore {check['owner']} custody: {check['reason']}")
                )
    return violations


def png_dimensions(data: bytes) -> tuple[int, int] | None:
    if not data.startswith(b"\x89PNG\r\n\x1a\n") or len(data) < 24:
        return None
    width = int.from_bytes(data[16:20], "big")
    height = int.from_bytes(data[20:24], "big")
    return width, height


def ico_dimensions(data: bytes) -> list[tuple[int, int]] | None:
    if len(data) < 6 or data[:2] != b"\0\0" or data[2:4] != b"\1\0":
        return None
    count = int.from_bytes(data[4:6], "little")
    if len(data) < 6 + count * 16:
        return None
    return [
        (data[index] or 256, data[index + 1] or 256)
        for index in range(6, 6 + count * 16, 16)
    ]


def scan_assets(root: Path) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    expected_mime_by_suffix = {
        ".ico": "image/x-icon",
        ".png": "image/png",
    }
    manifest_path = root / "packages/twenty-front/public/images/mhoo/asset-manifest.json"
    if not manifest_path.is_file():
        return [contract_violation(manifest_path.as_posix(), "missing", "Mhoo asset manifest")]
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [contract_violation(manifest_path.as_posix(), str(exc), "valid Mhoo asset manifest JSON")]

    source = manifest.get("source", {})
    source_path = root / "packages/twenty-front/public/images/mhoo" / source.get("path", "")
    if source_path.is_file():
        source_data = source_path.read_bytes()
        if len(source_data) != source.get("bytes") or hashlib.sha256(source_data).hexdigest() != source.get("sha256"):
            violations.append(contract_violation(source_path.as_posix(), "source bytes/hash mismatch", "custodied source bytes and SHA-256"))
    else:
        violations.append(contract_violation(source_path.as_posix(), "missing", "custodied source file"))

    asset_root = root / "packages/twenty-front/public/images/mhoo"
    listed_paths: set[str] = set()
    for asset in manifest.get("assets", []):
        relative = asset.get("path", "")
        if relative in listed_paths:
            violations.append(contract_violation(manifest_path.as_posix(), f"duplicate asset {relative}", "unique manifest paths"))
        listed_paths.add(relative)
        path = asset_root / relative
        if not path.is_file():
            violations.append(make_violation(manifest_path.as_posix(), 1, "missing-mhoo-asset", relative, "every manifest asset exists", "restore the generated Mhoo asset or update the governed manifest"))
            continue
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != asset.get("sha256"):
            violations.append(contract_violation(path.as_posix(), "asset SHA-256 mismatch", "manifest-custodied asset bytes"))
        if asset.get("source_sha256") != source.get("sha256"):
            violations.append(contract_violation(manifest_path.as_posix(), f"source mismatch for {relative}", "all derivatives point to the custodied source"))
        expected_mime = expected_mime_by_suffix.get(path.suffix.lower())
        if asset.get("mime_type") != expected_mime:
            violations.append(contract_violation(path.as_posix(), f"manifest MIME type {asset.get('mime_type')}", f"{expected_mime} for {path.suffix.lower()}"))
        dimensions = ico_dimensions(data) if path.suffix.lower() == ".ico" else png_dimensions(data)
        expected_dimensions = asset.get("dimensions")
        if expected_dimensions and isinstance(expected_dimensions[0], list):
            actual_dimension_set = sorted(dimensions or [])
            expected_dimension_set = sorted(tuple(item) for item in expected_dimensions)
            dimensions_match = actual_dimension_set == expected_dimension_set
        else:
            dimensions_match = dimensions == tuple(expected_dimensions or [])
        if dimensions is None or not dimensions_match:
            violations.append(contract_violation(path.as_posix(), "dimensions or MIME signature mismatch", f"{expected_dimensions} / {asset.get('mime_type')}"))
    actual_paths = {
        path.relative_to(asset_root).as_posix()
        for path in asset_root.rglob("*")
        if path.is_file() and path.suffix.lower() in {".png", ".ico"}
    }
    if actual_paths != listed_paths:
        violations.append(contract_violation(manifest_path.as_posix(), f"missing={sorted(listed_paths - actual_paths)}, orphaned={sorted(actual_paths - listed_paths)}", "manifest and generated image set match"))

    preset_path = root / "packages/twenty-shared/src/branding/brand-presets.ts"
    if preset_path.is_file():
        preset_text = preset_path.read_text(encoding="utf-8")
        for asset_path in sorted(set(re.findall(r"['\"](/images/mhoo/[^'\"]+)['\"]", preset_text))):
            if not (root / "packages/twenty-front/public" / asset_path.lstrip("/")).is_file():
                violations.append(make_violation(preset_path.as_posix(), 1, "missing-mhoo-asset", asset_path, "every Mhoo preset asset path exists", "restore the referenced asset or correct the canonical preset"))
    return violations


def first_line_containing(text: str, token: str) -> int:
    for number, line in enumerate(text.splitlines(), start=1):
        if token.casefold() in line.casefold():
            return number
    return 1


def scan_artifacts(root: Path, ledger: dict[str, Any]) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    for artifact in ledger["artifactFixtures"]:
        path = root / artifact["path"]
        if not path.is_file():
            violations.append(make_violation(artifact["path"], 1, "artifact-fixture-missing", "file missing", "committed production artifact fixture", "restore the deterministic artifact fixture before accepting the gate"))
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for token in artifact["requiredTokens"]:
            if token not in text:
                violations.append(make_violation(artifact["path"], 1, "artifact-required-token-missing", token, token, "update the fixture to match the selected product preset"))
        allowed = artifact.get("allowedTokens", [])
        for token in artifact["forbiddenTokens"]:
            if token in text and not any(token in allowed_token for allowed_token in allowed):
                violations.append(make_violation(artifact["path"], first_line_containing(text, token), "artifact-forbidden-residue", token, "no ungoverned customer residue", "remove the residue or classify the exact technical/provenance exception in the ledger"))
        violations.extend(scan_asset_references(artifact["path"], text, root))
    return violations


def git_head(root: Path) -> str:
    completed = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, check=False, capture_output=True, text=True)
    if completed.returncode != 0:
        raise LedgerError("cannot resolve the scanned commit")
    return completed.stdout.strip()


def run_scan(root: Path = ROOT) -> dict[str, Any]:
    ledger, ledger_sha = load_ledger(root)
    source_violations, file_count = scan_source(root, ledger)
    violations = source_violations + scan_contract(root) + scan_markers(root, ledger) + scan_assets(root) + scan_artifacts(root, ledger)
    violations.sort(key=lambda item: (item["path"], item["line"], item["ruleId"], item["detected"]))
    return {
        "schema": "mhoo.brand-residue-receipt.v1",
        "scannedCommit": git_head(root),
        "presets": ["mhoo", "twenty"],
        "ledgerVersion": ledger["version"],
        "ledgerSha256": ledger_sha,
        "artifacts": [artifact["id"] for artifact in ledger["artifactFixtures"]],
        "counts": {
            "files": file_count,
            "sourceRules": sum(1 for rule in ledger["pathRules"] if rule.get("scan") is True),
            "markers": len(ledger["markerChecks"]),
            "artifacts": len(ledger["artifactFixtures"]),
            "violations": len(violations),
        },
        "violations": violations,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="print only the deterministic receipt JSON")
    args = parser.parse_args()
    try:
        receipt = run_scan()
    except LedgerError as exc:
        print(f"Brand residue gate FAILED: {exc}", file=sys.stderr)
        return 1
    if args.json:
        print(canonical_json(receipt))
        return 0 if receipt["counts"]["violations"] == 0 else 1

    if receipt["counts"]["violations"]:
        print("Brand residue gate FAILED")
        for violation in receipt["violations"]:
            print(
                f"- {violation['path']}:{violation['line']} [{violation['ruleId']}] "
                f"{violation['detected']} (expected {violation['expected']}); {violation['remediation']}"
            )
    else:
        print("Brand residue gate PASSED")
    print(f"scanned_commit={receipt['scannedCommit']}")
    print(f"ledger_sha256={receipt['ledgerSha256']}")
    print(f"artifact_fixtures={len(receipt['artifacts'])}")
    print(f"counts={canonical_json(receipt['counts'])}")
    print(f"receipt_json={canonical_json(receipt)}")
    return 0 if receipt["counts"]["violations"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
