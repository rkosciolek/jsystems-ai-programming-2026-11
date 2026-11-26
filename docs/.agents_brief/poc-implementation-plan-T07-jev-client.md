# Brief T07 — Jev classifier client

- **Task:** T07, issue #16. Prerequisites T03a, T04, T06 (types) accepted. Concurrent workers on other folders.
- **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/001-ai-decision-pipeline.md` §3.2 (normalization table, category match, errors), TD-101, TD-105, §8 rows "Jev response mapping", "Jev request building", "Jev invalid response".
- `docs/ADR/002-backend-api.md` §3.3 last bullet (**Jev size limit: ≤ 1568 px per side**), §3.7.
- `docs/ADR/000-main-architecture.md` §10 "Mock provenance rules" (replay, mutations, freshness).
- Existing: `app/src/server/classifier/questions.ts` (question sets, `buildJevRequest`, `questionSetHash` — written in T03a; you may extend it but keep the question texts byte-identical, or the recordings become stale), `app/src/server/rules/index.ts` (`ClassifierResult`, `ClassifierAnswer`), `app/src/server/env`, `app/tests/fixtures/captured/**` (README, MUTATIONS.md, `jev-*` recordings), `app/scripts/capture/recorder.ts` (how the files are written). `app/AGENTS.md`.

## Contract (`app/src/server/classifier/index.ts`, `import 'server-only'`)
- `class ClassifierError extends Error { kind: 'upstream'|'invalid_response'|'timeout' }`.
- `classify(input: CaseInput, jpeg: Buffer, signal: AbortSignal, deps?: { fetch?: typeof fetch; apiKey?: string; model?: string }): Promise<ClassifierResult>`: downsizes a copy of the JPEG to fit inside 1568 × 1568 (sharp), builds the request with `buildJevRequest`, POSTs to `https://openrouter.ai/api/alpha/decisions` with Bearer key and the signal; non-2xx → logs status + ≤ 500 chars of body to `console.error` and throws `ClassifierError('upstream')`; network `TypeError` → `upstream`; abort → rethrow the abort (the pipeline decides timeout vs abort); response validated with a Zod schema derived from the recordings (unknown extra fields tolerated) → `invalid_response` on mismatch; answers normalized per ADR-001 §3.2 (noul: value `p ≥ 0.5`, certainty `max(p,1−p)`; choice: certainty `probabilities[choice]`; score: argmax level and its probability; `raw` keeps the original incl. `confidence`); `model` = snapshot from the response; `costUsd` from `usage.cost`; `latencyMs`.
- `app/tests/helpers/replay-fetch.ts`: `createReplayFetch(recordingNames: string[], opts?: { delayMs?: number; failWith?: 'network' })` returning a `fetch` that serves the recorded status, headers and body (streamed bodies re-emitted in their recorded chunks if the recording stores chunks; otherwise whole) in order and records the requests it received; `loadRecording(name)`; `applyMutation(json, path, value)` helper. T13/T14/T16 reuse this.

## Editable files
`app/src/server/classifier/**` (keep question texts unchanged), `app/tests/helpers/**`, `app/tests/unit/classifier/**`, `app/tests/fixtures/captured/MUTATIONS.md` (append rows only).

## Steps
1. Tests first, all on the recordings via the replay fetch: mapping for noul/choice/score on `jev-complaint-laptop-1` and `jev-return-phone-1`; p = 0.5 edge as a declared mutation; request building (complaint questions differ from return; JPEG data URL; no purchase date in state; empty return description → no `description_matches_photo`; image ≤ 1568 px); invalid response (mutation: `answers` removed) → `invalid_response`; recorded 400 and 401 → `upstream`; network `TypeError` → `upstream`; abort propagates; freshness: `questionSetHash` equals the hash in each `jev-*` `capture.json`. Declare every mutation in `MUTATIONS.md`. Red → record.
2. Implement; tests, lint, typecheck green. No inline response bodies in tests (TAC-05).

## Tool guidance (plan §4.2)
1. `--help` → Context7 → official docs last.
2. Research via `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<q>; answer with sources"`.
3. npm only, never install. No git. Never open `.env` files. Edit only the listed files. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T07-jev-client.report.md`: files, red/green with counts, mutations added, contradictions.
