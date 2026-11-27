# Brief T04 (tests first) — shared contracts, Polish strings, env

- **Task:** T04, issue #6. Concurrent: T11 (Haiku, theme files — disjoint). The orchestrator writes the implementation **after** your tests are red.
- **Worker:** Haiku subagent. Repo: `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Goal
Write failing Vitest unit tests that pin the contract below. Do not write the implementation.

## Read (sections only)
- `docs/PRD.md` §6 (AC-04…AC-52 strings), §8 Functional (categories, limits), §9 (UI strings).
- `docs/ADR/000-main-architecture.md` §5 (models, DecisionLogEntry fields), §7 (env table), TAC-04.
- `docs/ADR/001-ai-decision-pipeline.md` §4 (ImageAnalysis, DecisionOutcome, DateFacts), §3.6 (cited regex), §3.7 (revise_decision input).
- `docs/ADR/002-backend-api.md` §3.6 (env), §4 (NDJSON events).
- `docs/ADR/003-frontend.md` §4, TAC-003-04.

## Contract (the orchestrator implements exactly this)
`app/src/lib/domain/index.ts` re-exports:
- `CASE_TYPES = ['complaint','return'] as const`, `CHANNELS = ['online','store'] as const`, `DECISIONS = ['accepted','rejected','needs_info','escalated'] as const`.
- `CATEGORIES`: readonly array of `{ id, label }`, ids in order `laptop, smartphone, tablet, monitor, tv, audio, wearable, console, camera, other`, labels exactly PRD §8 (`Laptop`, `Smartfon`, `Tablet`, `Monitor`, `Telewizor`, `Słuchawki i audio`, `Smartwatch i opaska sportowa`, `Konsola do gier`, `Aparat fotograficzny`, `Inne`). `CategoryId` type.
- `DECISION_LABELS: Record<Decision, string>` = PRD AC-22 labels.
- `makeCaseInputSchema(today: string /* YYYY-MM-DD */)` → Zod schema for `{caseType, category, model, purchaseDate, channel, description}`; `model` trimmed 2–100; `purchaseDate` ISO `YYYY-MM-DD` ≤ today; description: complaint 20–2000 (after trim), return 0–2000; error messages are the `pl.errors.*` strings below, keyed by path. `CaseInput` type.
- `todayInWarsaw(now?: Date): string` → `YYYY-MM-DD` in Europe/Warsaw.
- `CITED_SECTION_REGEX = /^§\d+( ust\. \d+)?$/`.
- `DateFactsSchema`, `ImageAnalysisSchema` (ADR-001 §4: complaint-only/return-only fields optional), `DecisionOutcomeSchema` (`citedSections` min 1, each matching the regex; `path` `fast|llm`), `ReviseDecisionInputSchema` (`newDecision`, `reason` ≤ 300, optional `corrections {purchaseDate?, channel?}`).
- `CaseSummarySchema` `{caseType, category, model, purchaseDate, channel}`; `CaseEventSchema` = discriminated union on `type`: `progress {step: 'upload'|'analysis'|'decision'}`, `result {caseId, decision, firstMessage, caseSummary}`, `error {code: 'timeout'|'upstream'|'internal'}`. `firstMessage` = `{id: string, role: 'assistant', parts: [{type:'text', text}], metadata: {decision}}`.
- `DecisionDataSchema` `{decision, previous?, reason?}`; type `CaseUIMessage` (AI SDK `UIMessage<{decision?: Decision; revised?: boolean}, {decision: DecisionData}>`).
- `CASE_ID_REGEX = /^HSD-\d{8}-[A-Z0-9]{4}$/`.
- `DecisionLogEntrySchema` and `LOG_FIELDS` (string array = exactly the ADR-000 §5 allowlist field names).

`app/src/lib/i18n/pl.ts` exports `pl` with at least: `appName` ("Hardware Service Decision Copilot"), `form.*` (title "Zgłoś reklamację lub zwrot", case-type labels/subtitles, placeholders, hints, "Wybierz zdjęcie", "Usuń", "Wyślij zgłoszenie", "(opcjonalnie)", summary "Popraw zaznaczone pola."), `errors.*` (every PRD error string: AC-04, AC-05, AC-07, AC-12, AC-13, AC-45 banner, AC-46, AC-52, plus required-choice messages of your choice in Polish), `progress.*` (3 step lines), `chat.*` ("Wyślij", "Ponów", "Nowa sprawa", "Zmieniona ocena", the confirm text from Flow 4.6, section headings from PRD §9.3), `disclaimer` (AC-25 exact).
Test for TAC-003-04: collect every PRD string in quotes from AC-04…AC-52 and §9 that is UI text (list them literally in the test) and assert each appears somewhere in `JSON.stringify(pl)`.

`app/src/server/env/index.ts` exports `parseEnv(source: Record<string,string|undefined>)` → typed env with ADR-000 §7 defaults (`DECISION_MODE` enum `auto|llm-only|fast-only`, `JEV_CONFIDENCE_THRESHOLD` number in [0.5, 0.99], `CASE_TIMEOUT_MS` default 90000, `CASE_TTL_MS` 1000–86400000 default 7200000, `VISION_MODEL` defaults to `LLM_MODEL`, `JEV_MODEL` default `typesafe/jev-1.14`, `LLM_REASONING_EFFORT` default `medium`, `POLICIES_DIR` default `../docs/policies`, `DECISION_LOG_PATH` default `./var/decisions.jsonl`), throwing `EnvError` whose message lists missing/invalid variable **names** and never values; and `getEnv()` (cached `parseEnv(process.env)`).

## Editable files
`app/tests/unit/domain/*.test.ts` only (e.g. `schemas.test.ts`, `pl.test.ts`, `env.test.ts`).

## Steps
1. Write tests covering: enums and order; each schema's valid and invalid cases incl. boundaries (model 1/2/100/101 chars after trim; description 19/20/2000/2001 for complaint, empty return valid; date today valid, tomorrow invalid with the AC-05 message); cited regex (`§3 ust. 2` ok, `§ 3` not); event union; env defaults, missing `OPENROUTER_API_KEY` error names the variable and does not contain a sentinel value you pass in another variable; threshold 1.5 invalid; `CASE_TTL_MS=500` invalid.
2. Run `npm test` in `app/`: they must fail because the modules do not exist. Record the red summary line.

## Tool guidance (plan §4.2)
`--help` → Context7 (`npx ctx7@latest`) → web last. npm only, never install. No git. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T04-contracts-tests.report.md`: test files, number of tests, red output summary line, contradictions. Final answer ≤ 10 lines.
