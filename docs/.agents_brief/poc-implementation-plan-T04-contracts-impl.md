# Brief T04 (implementation) — make the contract tests green

- **Task:** T04, issue #6. Concurrent: none on these files.
- **Worker:** Sonnet subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Goal
Implement the contract in `docs/.agents_brief/poc-implementation-plan-T04-contracts-tests.md` ("Contract" section) so that the red suites in `app/tests/unit/domain/` pass. Minimum code, clean and typed (no `any`, `strict`, `noUncheckedIndexedAccess`).

## Orchestrator decisions on the test worker's open points
1. `DecisionOutcomeSchema` follows ADR-001 §4: `{decision, citedSections (≥1, regex), reasonCodes: string[], path: 'fast'|'llm', messageMarkdown: string}`.
2. `DAMAGE_CAUSES = ['none_visible','manufacturing_defect','normal_wear','impact','liquid','heat','tampering'] as const` (ADR-001 §3.2) — use it for `ImageAnalysis.damage.probableCause`; export it.
3. Export also `makeReviseDecisionInputSchema(today)` (corrections.purchaseDate ≤ today); `ReviseDecisionInputSchema` = the same without the date bound.
4. `LLM_MODEL` is required (ADR-000 §7, TAC-04). `EnvError` is exported. Env keys are the env variable names.
5. The client 95 s timeout (ADR-003 §3.3) is a client safety margin over the 90 s server budget — not a contradiction; nothing to do in T04.

## Read
The brief above, the three test files in `app/tests/unit/domain/`, `docs/ADR/001-ai-decision-pipeline.md` §4, `docs/ADR/000-main-architecture.md` §5 and §7, `docs/ADR/002-backend-api.md` §3.6 and §4, `docs/PRD.md` §6 and §9 for exact strings. `app/AGENTS.md`.

## Editable files
`app/src/lib/domain/**`, `app/src/lib/i18n/pl.ts`, `app/src/server/env/**`. **Do not edit tests.** If a test contradicts the ADR/PRD, leave it failing and report it with the exact assertion.

## Checks (in `app/`)
`npm test` (all suites incl. `tests/unit/app-header.test.tsx`), `npm run lint`, `npm run typecheck`, `npm run build`. Report each with pass/fail and the count lines.

## Tool guidance (plan §4.2)
`--help` → Context7 (`npx ctx7@latest library zod "discriminatedUnion superRefine"`, `npx ctx7@latest docs /vercel/ai/ai_7.0.0 "UIMessage generic types"`) → web last. npm only, never install. No git. `src/server/env` starts with `import 'server-only'`.

## Report
`docs/.agents_brief/poc-implementation-plan-T04-contracts-impl.report.md`; final answer ≤ 10 lines.
