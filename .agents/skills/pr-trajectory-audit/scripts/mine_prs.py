#!/usr/bin/env python3
"""Deterministic, side-effect-free Tier-1 evidence for one GitHub PR."""

import argparse
import json
import re
import subprocess
from datetime import datetime, timedelta
from difflib import SequenceMatcher

NARROW_FIX = re.compile(r"^fix\((?!deps\b|dependencies\b)[\w\-/. ]+\):", re.I)
OUT_OF_SCOPE = ("Dockerfile", "docker-compose", "package.json", "package-lock.json", "wrangler.jsonc", ".github/workflows/", "migrations/", "cloud/missions.sql")
BOT_NOISE = re.compile(r"^(bump |release \d|chore\(deps\)|update dependency\b)", re.I)


def gh(args, context):
    try:
        result = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8")
    except FileNotFoundError as exc:
        raise SystemExit(f"gh unavailable while {context}") from exc
    if result.returncode:
        raise SystemExit(f"gh failed while {context}: {result.stderr.strip()[:300]}")
    return json.loads(result.stdout or "null")


def ci_status(repo, number):
    try:
        rows = gh(["pr", "checks", str(number), "--repo", repo, "--json", "name,bucket"], "reading checks") or []
    except SystemExit as exc:
        return {"verdict": "UNKNOWN", "reason": str(exc)}
    real = [row for row in rows if not any(token in (row.get("name") or "").lower() for token in ("coderabbit", "codecov", "review"))]
    if not real:
        return {"verdict": "FAIL", "reason": "no repository validation check ran"}
    buckets = {(row.get("bucket") or "").lower() for row in real}
    if "fail" in buckets:
        return {"verdict": "FAIL", "reason": "at least one repository check failed"}
    if "pending" in buckets:
        return {"verdict": "PENDING", "reason": "repository checks are still running"}
    if "pass" not in buckets:
        return {"verdict": "UNKNOWN", "reason": "no repository check completed successfully"}
    return {"verdict": "PASS", "reason": "repository validation completed successfully"}


def scope_check(title, files, count):
    if not NARROW_FIX.match(title or ""):
        return {"verdict": "PASS", "reason": "title does not claim a narrow fix scope"}
    flagged = [name for name in files if any(marker in name for marker in OUT_OF_SCOPE)]
    if flagged or count > 20:
        return {"verdict": "FAIL", "reason": "narrow fix touches broad or sensitive scope", "paths": flagged}
    return {"verdict": "PASS", "reason": "changed paths fit the narrow title heuristic"}


def duplicates(repo, number, title, created_at):
    if not created_at or BOT_NOISE.match(title or ""):
        return {"verdict": "PASS", "matches": []}
    observed = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    start = (observed - timedelta(days=14)).strftime("%Y-%m-%d")
    end = (observed + timedelta(days=14)).strftime("%Y-%m-%d")
    rows = gh(["pr", "list", "--repo", repo, "--state", "all", "--limit", "200", "--search", f"created:{start}..{end}", "--json", "number,title"], "reading nearby PRs") or []
    matches = []
    for row in rows:
        if row.get("number") == number or BOT_NOISE.match(row.get("title") or ""):
            continue
        similarity = SequenceMatcher(None, title.lower(), (row.get("title") or "").lower()).ratio()
        if similarity >= 0.55:
            matches.append({"number": row["number"], "title": row["title"], "similarity": round(similarity, 2)})
    return {"verdict": "FAIL" if matches else "PASS", "matches": sorted(matches, key=lambda item: -item["similarity"])}


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    checks = sub.add_parser("checks")
    checks.add_argument("repo")
    checks.add_argument("number", type=int)
    checks.add_argument("--json", action="store_true")
    args = parser.parse_args()
    pr = gh(["pr", "view", str(args.number), "--repo", args.repo, "--json", "title,files,changedFiles,createdAt,headRefOid,baseRefOid"], "reading PR")
    files = [item["path"] for item in (pr.get("files") or [])]
    result = {
        "repo": args.repo, "pr_number": args.number, "head": pr.get("headRefOid"), "base": pr.get("baseRefOid"), "title": pr.get("title") or "",
        "checks": {
            "ci_status": ci_status(args.repo, args.number),
            "scope_blast_radius": scope_check(pr.get("title") or "", files, pr.get("changedFiles") or len(files)),
            "duplicate_vs_recent": duplicates(args.repo, args.number, pr.get("title") or "", pr.get("createdAt")),
        },
    }
    print(json.dumps(result, indent=2 if args.json else None, sort_keys=True))


if __name__ == "__main__":
    main()
