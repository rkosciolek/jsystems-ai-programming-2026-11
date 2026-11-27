# Brief T14 — `POST /api/cases` and the case pipeline

- **Task:** T14, issue #23. Prerequisites T05, T07, T08, T13 accepted. Concurrent: T15 (frontend page) — disjoint.
- **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/002-backend-api.md` §3.1 (all steps, failure handling, case ID), §4 (events, validation body), §5, §8 integration rows, TAC-002-01/02/04/05.
- `docs/ADR/001-ai-decision-pipeline.md` §3.1 (orchestration order), §3.2 "Errors" (signal check before fallback), TD-105.
- `docs/ADR/000-main-architecture.md` §5 DecisionLogEntry fields (what `case_decided`, `case_failed`, `case_aborted` carry, incl. `models`, `latencyMs`, `costUsd`, `shadowFastPathDecision`, `gateFailedAt`, `minGatingCertainty`, `uncertainQuestions`, `classifierAnswers`, `classifierError`), TAC-04, TAC-07, TAC-08.
- Code (use, do not change): `app/src/server/{images,classifier,rules,templates,llm,case-store,case-id,decision-log,env,policies,prompts}`, `app/src/lib/domain`, `app/src/lib/i18n/pl.ts`, `app/tests/helpers/replay-fetch.ts`, recordings in `app/tests/fixtures/captured/`. `app/AGENTS.md`.

## Contract
- `app/src/server/pipeline/index.ts` (`import 'server-only'`): `runCasePipeline(input, photo: Buffer, opts: { signal: AbortSignal; emit(event: CaseEvent): void; deps?: { fetch?: typeof fetch; now?: () => Date } })` — order: caseId first (ADR-002 §3.1 step 0), facts, `processImage` → `progress upload`; classify (fallback rules per ADR-001 §3.2; in `fast-only` a Jev error is `upstream`) and vision on the LLM route → `progress analysis`; rules/template or `decide` → finalize → `progress decision`; save `CaseRecord` (firstMessage as `CaseUIMessage` with a stable id, `metadata.decision`), log `case_decided`, emit `result` with `caseSummary`. Failures: log `case_failed {step, failureCode}` and emit `error {code}`; client disconnect → log `case_aborted`, emit nothing, save nothing. `llm-only`: log `shadowFastPathDecision`. The `fetch` dep is passed to both the Jev client and the provider.
- `app/src/app/api/cases/route.ts`: `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, `maxDuration = 120`; preflight 413 on `Content-Length` > 10 MB + 64 KB **before** reading the body; `formData()`; fields validated with `makeCaseInputSchema(todayInWarsaw())`; exactly one `photo`; > 10 MiB → 413; content not JPEG/PNG/WebP (via `processImage`'s detection or sharp metadata) → 415; extension/MIME mismatch accepted; validation errors `{ error: 'validation', fields }` with the exact Polish messages; otherwise an NDJSON stream (`application/x-ndjson`, `no-store`) driven by `AbortSignal.any([request.signal, AbortSignal.timeout(CASE_TIMEOUT_MS)])`. Non-POST → 405. No client-visible text may contain a stack trace, model ID, provider name or "openrouter" (AC-47).
- `app/src/instrumentation.ts`: keep the T09b startup checks; adjust only if needed.

## Editable files
`app/src/app/api/cases/**`, `app/src/server/pipeline/**`, `app/src/instrumentation.ts`, `app/tests/integration/cases/**`, `app/tests/fixtures/captured/MUTATIONS.md` (append rows only).

## Steps
1. Integration tests first (Vitest node env, route handler called in process with a real `Request` built from `FormData` with the **real photos**; Jev and LLM replayed from recordings through the replay fetch — inject it via a test-only module hook, e.g. `setPipelineDeps()` exported from the pipeline, never via env): every row of ADR-002 §8 that concerns `/api/cases` (valid complaint fast path with `laptop-1.png` and zero LLM requests; field validation 400; file-size 413 and preflight 413 with `formData` never called — generated payloads allowed only here; 415 for a text payload named `fake.png`; extension mismatch accepted; timeout with a delayed replay and `CASE_TIMEOUT_MS=200` → `error timeout` within 1 s and **no** LLM request; recorded Jev 4xx → LLM path; recorded LLM 4xx → `error upstream` with no provider text; network `TypeError`; client abort → `case_aborted`); event order `upload → analysis → decision → result`; one log line per case; TAC-07 sentinel `ZZ-SENTINEL-ZZ` in the description never appears in the log file; `llm-only` logs `shadowFastPathDecision`. Use a temp `DECISION_LOG_PATH`. Declare mutations (e.g. Jev certainties) in `MUTATIONS.md`. Red → record.
2. Implement; `npm test` (whole suite), `npm run lint`, `npm run typecheck`, `npm run build` green.

## Tool guidance (plan §4.2)
1. `--help` → Context7 (`npx ctx7@latest docs /vercel/next.js/v16.4.5 "route handler formData streaming response"`) → official docs last.
2. Research via `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<q>; answer with sources"`.
3. npm only, never install. No git. Never open `.env`; no real API calls (replay only). Edit only the listed files. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T14-api-cases.report.md`: files, red/green with counts, ADR-002 §8 row → test name table, mutations, contradictions.
