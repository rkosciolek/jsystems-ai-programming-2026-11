# Outputs

## claims.json (single source of truth)

A JSON list. One object per claim:

```json
{
  "id": "C012",
  "claim": "paraphrased claim",
  "numbers": {"label": 12.3},
  "subject": "language / model / population",
  "condition": "task, dataset or setting",
  "like_for_like": "yes | no | partly",
  "url": "https://...",
  "identifier": "arXiv:... / DOI:...",
  "location": "Table 3",
  "date": "2026-06-05",
  "source_type": "peer-reviewed | preprint | technical report | vendor claim | leaderboard | institutional report",
  "researcher_confidence": "HIGH | MEDIUM | LOW",
  "key": true,
  "verification": {"status": "pending | CONFIRMED | CONFIRMED-WITH-CORRECTION | NOT-CONFIRMED | UNREACHABLE", "observed": "", "verifier": "V2", "note": ""}
}
```

Both language reports, the charts and the claim cards take numbers from this file. Never retype a number from a report.

## Report structure (Markdown, same structure in both languages)

1. Bottom line: 3 to 5 numbered findings that answer the question, with a one-line confidence statement.
2. What the original claim says versus what the primary source says (only when a claim or article was traced).
3. Evidence by area: tables with columns finding, numbers, source with location, like-for-like, status (verified / partial / not verified).
4. Synthesis: direct answer to the research question, what the evidence supports and what it does not.
5. What was not found and how many iterations were spent on it. Leads that stayed unverified.
6. Corrections made during verification.
7. Practical implications.
8. Method and limits: tools used for reading sources, what could not be opened, which numbers to spot-check by hand (mark with a star).

Names: `REPORT.<lang>.md`. Use the decimal convention of each language. Keep the same tables and the same numbers.

## Parity check

`python3 scripts/check_parity.py REPORT.en.md REPORT.pl.md` lists numbers that appear in only one file after normalizing decimal commas. Fix real differences. The script already ignores dates, heading numbers and URLs or identifiers. Remaining benign differences are a digit in one language and a spelled-out number in the other ("6" vs "six"); keep the digit form in both where possible.

## Artifacts (HTML, one per language)

Build from one template with a translation dictionary and a shared data object, then generate the two files. Rules:
- Load the Artifact tool's quickstart (`action: "quickstart"`, `intent: "other"`) and follow its page contract and design guidance before writing.
- A `<title>` of two to four words naming the page. Put the explanation in the publish description.
- Define all colors as tokens on `:root` with dark overrides under `prefers-color-scheme` and `data-theme`. Set an explicit body background.
- External scripts only from cdnjs.cloudflare.com with an exact version at least two weeks old (for example Chart.js 4.4.1). Fonts only from Google Fonts. Inline everything else.
- Works at 400 px width, no horizontal scroll, 16 px side gutters.
- Content: a verdict cards section filterable by area; at least one chart per evidence area; at least three interactive elements that explain the data (view toggle, noise or uncertainty explorer, calculator, filter); a section on what was not found; method and sources with links.
- Label values read from figures as readings. Never show an unverified number as a finding.
- Rebuild charts on theme change.
- Syntax-check the page script (for example `node -e "new Function(code)"`). Ask the user before starting a local server for a visual preview.
- Publish both artifacts (private by default), put the links in the Markdown, and tell the user the links are private until shared.

## Folder layout in the target location

```
<target>/
  REPORT.<lang1>.md
  REPORT.<lang2>.md
  artifacts/ (template.html, artifact.<lang1>.html, artifact.<lang2>.html)
  evidence/ (researcher reports, verifier logs, claims.json)
```

Do not commit or push unless asked. If asked: separate commits for reports plus artifacts and for evidence, named paths only.
