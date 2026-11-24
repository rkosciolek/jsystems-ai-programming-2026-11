#!/usr/bin/env python3
"""Compare numbers between two language versions of a report.

Usage: python3 -I check_parity.py <report_a.md> <report_b.md>
Normalizes decimal commas to dots, ignores digits inside URLs and identifiers,
then prints numbers present in only one file (as multiset differences).
Exit code 0 = identical number sets, 1 = differences found (review them).
"""
import re
import sys
from collections import Counter
from pathlib import Path

URL = re.compile(r"https?://\S+")
ID = re.compile(r"\b(?:arXiv:?\s*)?\d{4}\.\d{4,5}(?:v\d+)?\b|\b10\.\d{4,}/\S+")
HEADING_NUM = re.compile(r"^\s{0,3}(?:#{1,6}\s+)?\d+[.)]\s+", re.M)
EN_MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
PL_MONTH = r"(?:stycz|lut|mar|kwie|maj|czerw|lip|sierp|wrze|paźdz|listopad|grud)\w*"
DATES = [
    re.compile(r"\b\d{1,2}\.\d{1,2}\.\d{4}\b"),
    re.compile(rf"\b\d{{1,2}}\s+{EN_MONTH}\s+\d{{4}}\b"),
    re.compile(rf"\b\d{{1,2}}\s+{PL_MONTH}\s+\d{{4}}\b"),
    re.compile(rf"\b{EN_MONTH}\s+\d{{4}}\b"),
    re.compile(rf"\b{PL_MONTH}\s+\d{{4}}\b"),
]


def numbers(text: str) -> Counter:
    text = URL.sub(" ", text)
    text = ID.sub(" ", text)
    text = HEADING_NUM.sub("", text)
    for d in DATES:
        text = d.sub(" ", text)
    text = re.sub(r"(?<=\d),(?=\d)", ".", text)
    found = re.findall(r"(?<![\w.])[-+−]?\d+(?:\.\d+)?(?=x\b|×|\W|$)", text)
    return Counter(n.replace("−", "-").lstrip("+") for n in found)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: check_parity.py <a.md> <b.md>")
        return 2
    a = Path(sys.argv[1]).read_text(encoding="utf-8")
    b = Path(sys.argv[2]).read_text(encoding="utf-8")
    ca, cb = numbers(a), numbers(b)
    only_a = ca - cb
    only_b = cb - ca
    if not only_a and not only_b:
        print("PARITY OK: identical number multisets")
        return 0
    print(f"Only in {Path(sys.argv[1]).name}: {dict(sorted(only_a.items()))}")
    print(f"Only in {Path(sys.argv[2]).name}: {dict(sorted(only_b.items()))}")
    print("Review each difference. Section numbers, list numbering and dates written differently can be benign.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
