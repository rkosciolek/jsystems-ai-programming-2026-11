# Brief Q3.4 — accept policy section ranges from the decision LLM

- **Task:** Q3 follow-up (issue #24). Concurrent: T17 (chat UI). **Worker:** Haiku subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Problem
Real decision recordings (`app/tests/fixtures/captured/llm-decision-return-phone-1`) cite ranges like `§3 ust. 1–2` (en dash; `-` also possible) in `citedSections` and in `messageMarkdown`. `CITED_SECTION_REGEX` and `validateFirstMessage` reject them, so `decide` retries and ends `escalated / llm_inconsistent` in production (4 of 4 captures). A test in `app/tests/integration/llm/llm.integration.test.ts` currently hides this with a declared mutation (see `app/tests/fixtures/captured/MUTATIONS.md`, Q3-fixes row).

## Fix
1. In `app/src/server/llm/decide.ts` (or a helper in `app/src/server/llm/citations.ts`): `normalizeCitedSections(list)` expands `§N ust. a–b` / `§N ust. a-b` and `§N ust. a, b` into separate `§N ust. a` … `§N ust. b` entries, trims, de-duplicates; apply it to the LLM output **before** `checkLlmOutcome` and validation.
2. In `app/src/server/templates` `validateFirstMessage`: a cited section `§N ust. k` counts as present in the text when the text contains it verbatim **or** contains a range/list for the same `§N` that covers `k` (`§N ust. a–b` with a ≤ k ≤ b, or `§N ust. a, k`). Keep every other rule.
3. Remove the range mutation from the integration test and its row from `MUTATIONS.md`; the unmodified recording must now pass.
4. Unit tests for the normalizer and the validator (en dash, hyphen, comma list, out-of-range → not present). Red first.

## Editable files
`app/src/server/llm/decide.ts`, `app/src/server/llm/citations.ts` (new), `app/src/server/templates/**`, `app/tests/unit/llm/**`, `app/tests/unit/templates/**`, `app/tests/integration/llm/**`, `app/tests/fixtures/captured/MUTATIONS.md`.

## Checks
`npx vitest run tests/unit/llm tests/unit/templates tests/integration/llm`, `npm run lint`, `npm run typecheck` (report failures from `app/src/components/chat` or `app/tests/unit/chat` as the other worker's). No git, no install, never open `.env`, scratch only under `app/var/`.

## Report
`docs/.agents_brief/poc-implementation-plan-Q3-fix-ranges.report.md`; final answer ≤ 8 lines.
