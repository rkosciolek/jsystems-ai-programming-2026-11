#!/usr/bin/env python3
"""Quality gate for a researcher report.

Usage: python3 -I check_researcher_report.py <report.md> [--min-iterations 5]
Exit code 0 = pass, 1 = fail (a list of fixes is printed for the researcher).
"""
import re
import sys
from pathlib import Path


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print("usage: check_researcher_report.py <report.md> [--min-iterations N]")
        return 2
    min_iter = 5
    if "--min-iterations" in sys.argv:
        min_iter = int(sys.argv[sys.argv.index("--min-iterations") + 1])
        args = [a for a in args if a != str(min_iter)]

    path = Path(args[0])
    if not path.is_file():
        print(f"FAIL: file does not exist: {path}")
        return 1
    text = path.read_text(encoding="utf-8")
    problems = []

    iters = re.findall(r"^#{2,4}\s*Iteration\s+(\d+)\b", text, flags=re.M | re.I)
    nums = sorted({int(i) for i in iters})
    if len(nums) < min_iter:
        problems.append(
            f"Iteration log has {len(nums)} numbered iteration(s) {nums}; need at least {min_iter} "
            "('### Iteration N - strategy - queries - sources - result')."
        )

    if not re.search(r"^#{1,3}\s*.*not found", text, flags=re.M | re.I):
        problems.append("No 'Not found' section.")

    if not re.search(r"^#{1,3}\s*.*findings", text, flags=re.M | re.I):
        problems.append("No 'Findings' section.")

    # Only the findings section is checked for URL/date/confidence per row.
    m = re.search(r"^#{1,3}[^\n]*findings[^\n]*\n(.*?)(?=^#{1,3}\s|\Z)", text, flags=re.M | re.S | re.I)
    scope = m.group(1) if m else text
    rows = [ln for ln in scope.splitlines() if ln.strip().startswith("|")]
    data_rows = [r for r in rows if not re.match(r"^\|\s*[-: ]+\|", r) and not re.search(r"\|\s*ID\s*\|", r, re.I)]
    no_url = [r[:80] for r in data_rows if "http" not in r and "arxiv" not in r.lower()]
    no_date = [r[:80] for r in data_rows if not re.search(r"20\d\d", r)]
    no_conf = [
        r[:80]
        for r in data_rows
        if not re.search(r"\b(HIGH|MEDIUM|LOW|UNVERIFIED)", r, re.I)
    ]
    if no_url:
        problems.append(f"{len(no_url)} table row(s) without URL or identifier, e.g. {no_url[0]!r}")
    if no_date:
        problems.append(f"{len(no_date)} table row(s) without a date, e.g. {no_date[0]!r}")
    if no_conf:
        problems.append(f"{len(no_conf)} table row(s) without a confidence rating, e.g. {no_conf[0]!r}")

    native = re.search(
        r"iteration\s*2[^\n]*(polish|czech|russian|ukrain|native|national|regional|language|[a-z]+-language)",
        text,
        flags=re.I,
    )
    if not native:
        problems.append("Iteration 2 does not mention native-language or regional sources.")

    if problems:
        print(f"FAIL: {path.name}")
        for p in problems:
            print(" -", p)
        return 1
    print(f"PASS: {path.name} ({len(nums)} iterations, {len(data_rows)} finding rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
