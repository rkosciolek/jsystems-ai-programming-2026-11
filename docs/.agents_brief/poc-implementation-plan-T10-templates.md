# Brief T10 — fast-path first-message templates and finalizer

- **Task:** T10, issue #21. Prerequisite: T06 (`server/rules` outcome shape) accepted. Concurrent workers on other folders.
- **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/001-ai-decision-pipeline.md` §3.3 (reason codes, cited arrays, damaged-item complaint hint for R5/R7), §3.4, §3.6 "Finalizer", §5 (`renderFirstMessage`), §8 rows "Templates", "Disclaimer".
- `docs/PRD.md` AC-23…AC-29, §11.3, §11.7, §11.8, §12 (escalation placeholder "Specjalista skontaktuje się w sprawie numeru HSD-…").
- `docs/policies/*.md` (to phrase each justification correctly — cite only sections that exist).
- Contracts: `app/src/lib/domain`, `app/src/lib/i18n/pl.ts` (`disclaimer`, decision labels, section headings), `app/src/server/rules/index.ts` (outcome type, `ClassifierResult`). The decision prompts `app/src/server/prompts/decision-*.md` show the heading format the LLM path uses — templates must match it exactly (`## Dzień dobry`, `## Podsumowanie zgłoszenia`, `## Wstępna ocena`, `## Uzasadnienie`, `## Co widzimy na zdjęciu`, `## Kolejne kroki`).

## Contract (`app/src/server/templates/index.ts`, starts with `import 'server-only'`)
- `renderFirstMessage(input: CaseInput, outcome: RulesOutcome, classifier: ClassifierResult | null, caseId: string, facts: DateFacts): string` — Markdown with the 6 headings in order; summary lists case number, case type, category label, model, purchase date (DD.MM.YYYY), channel label; the decision label in bold; justification citing every element of `outcome.citedSections`; image findings generated from classifier values (e.g. "Na zdjęciu widać laptop bez widocznych uszkodzeń zewnętrznych."); next steps per reason code (complaint: pack with charger, backup data, remove account locks, seller pays shipping, final answer within 14 days; return: factory reset, pack, refund per policy, possible deduction); `nearDeadline` note ("datę zakupu traktujemy jako datę wydania/otrzymania towaru"); escalation: case number + the PRD §12 placeholder; R5/R7 with condition 4: complaint hint. A template exists for **every** reason code from both tables plus `no_rule_matched`, `description_photo_mismatch`, `llm_inconsistent`.
- `finalizeFirstMessage(markdown: string): string` — strips any disclaimer variant the model wrote (any paragraph containing "wstępna ocena przygotowana automatycznie") and appends exactly `pl.disclaimer` once as the last paragraph.
- `validateFirstMessage(markdown: string, citedSections: string[]): { ok: true } | { ok: false; problems: string[] }` — 6 headings present in order; ≥ 1 cited section, each matching `CITED_SECTION_REGEX` and appearing in the text.

## Editable files
`app/src/server/templates/**`, `app/tests/unit/templates/**`.

## Steps
1. Tests first: for each reason code — 6 headings in order, case number present, each cited § present, no "Pan"/"Pani" (word match), no emoji; `nearDeadline` note when flagged; complaint hint for condition 4; finalizer leaves exactly one canonical disclaimer at the end even when the input had a variant; validator catches a missing heading and a malformed citation. Red → record.
2. Implement; tests, lint, typecheck green.

## Tool guidance (plan §4.2)
1. `--help` → Context7 → web last. Research via `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<q>; answer with sources"`.
2. npm only, never install. No git. Edit only the listed files. Report contradictions instead of resolving them.

## Report
`docs/.agents_brief/poc-implementation-plan-T10-templates.report.md`: files, red/green with counts, reason-code → template coverage table, contradictions.
