# Brief T06 — decision rules

- **Task:** T06, issue #15. Concurrent: T05, T08 (Haiku), T12 (Luna). Disjoint files.
- **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Goal
Pure, fully unit-tested rule module: date facts, row-level gate, complaint and return decision tables, always-LLM list, the three modes, and `checkLlmOutcome`.

## Read (authoritative — follow exactly)
- `docs/ADR/001-ai-decision-pipeline.md` §3.2 "Normalization" and "Category match", **§3.3 entirely** (row order C3, C4, C1, C2, C3b, C5, C6, C7, C8 and R3, R8, R1, R2, R3b, R4–R7; cited arrays; reason codes; modes), §3.6 "Hard constraints", §4, §5 (signatures), TD-101, TD-102, §8 rows from "Row-level gate" to "checkLlmOutcome", TAC-001-01, TAC-001-05.
- `docs/policies/*.md` (for TAC-001-05 numbers).
- Contracts: `app/src/lib/domain/**`, `app/src/server/env`. `app/AGENTS.md`.

## Contract (`app/src/server/rules/index.ts`, starts with `import 'server-only'`)
- `type ClassifierAnswer = { value: boolean | string | number; certainty: number; raw?: unknown }`; `type ClassifierResult = { answers: Record<string, ClassifierAnswer>; model: string; costUsd?: number; latencyMs?: number }` (export these; T07 imports them).
- `computeFacts(input: CaseInput, today: string /* YYYY-MM-DD Warsaw */): DateFacts`.
- `evaluate(input, classifier: ClassifierResult | null, facts, config: { threshold: number; mode: 'auto'|'llm-only'|'fast-only' })` → `{ route: 'fast'|'llm'; outcome?: { decision; citedSections; reasonCodes; templateKey: string /* reason code */; notes?: { complaintHint?: boolean } }; shadowOutcome?: same | null; reasons: string[]; minGatingCertainty: number | null; gateFailedAt: string | null; uncertainQuestions: string[] }`. In `fast-only` with a null classifier, throw `RulesClassifierMissingError` (the pipeline maps it to `upstream`).
- `checkLlmOutcome(input, facts, classifier | null, outcome: { decision; citedSections }, imageAnalysis?: { damage?: { probableCause?: string } } | null, threshold = 0.8)` → `{ ok: true } | { ok: false; violations: string[] }` (escalated always ok).
- Constants `LIABILITY_MONTHS = 24`, `WITHDRAWAL_DAYS = 14`, `VOLUNTARY_DAYS = 30` with policy-section comments.

## Editable files
`app/src/server/rules/**`, `app/tests/unit/rules/**`.

## Steps
1. Tests first covering **every row and every boundary** listed in ADR-001 §8 (incl. 2024-02-29 clamp, day 14/15, day 30/31, liabilityEnd/+1, expired + blurry → C4, R8 with low-certainty condition, threshold 0.80 inclusive and 0.7999, `normal_wear` → LLM, all always-LLM reasons, fast-only fixed templates, llm-only shadow outcome, R5/R7 condition 4 complaint hint, TAC-001-05 policy numbers). Classifier inputs in these unit tests are built with a small helper, because the recordings (T03a) do not exist yet; T07 will add mapping tests on the recordings. Red → record.
2. Implement; `npx vitest run tests/unit/rules`, lint, typecheck green.

## Tool guidance (plan §4.2)
1. `--help` → Context7 (`npx ctx7@latest`) → web last.
2. Research: `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<question>; answer with sources"`.
3. npm only, never install. No git. Edit only the listed files. Report contradictions instead of resolving them.

## Report
`docs/.agents_brief/poc-implementation-plan-T06-rules.report.md`: files, red/green with counts, a row-coverage table (row → test name), contradictions.
